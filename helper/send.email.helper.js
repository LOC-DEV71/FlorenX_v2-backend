const nodemailer = require('nodemailer');
const System = require("../api/v1/Models/system.model");

module.exports.sendMail = async (email, subject, html) => {
    try {
        const systemConfig = await System.findOne({});
        const emailConfig = systemConfig?.email;

        if (!emailConfig) {
            console.log("Error: Email is not configured in System Settings.");
            return false;
        }

        let transporter;
        let fromAddress = `"${emailConfig.senderName || 'FlorenX System'}" <${emailConfig.smtpEmail}>`;

        if (emailConfig.provider === 'resend') {
            if (!emailConfig.resendApiKey) {
                console.log("Error: Resend API Key is missing.");
                return false;
            }
            transporter = nodemailer.createTransport({
                host: 'smtp.resend.com',
                port: 2525, // Resend SMTP hỗ trợ port 2525 để né firewall
                secure: false, 
                requireTLS: true,
                auth: {
                    user: 'resend', // Mặc định của Resend
                    pass: emailConfig.resendApiKey.replace(/\s+/g, '')
                }
            });
            
            // Nếu người dùng chưa xác thực domain trên Resend, họ chỉ được gửi từ onboarding@resend.dev
            // Tuy nhiên, vì Admin có thể đã xác thực domain, ta sẽ để From dựa trên smtpEmail
            if(!emailConfig.smtpEmail) {
                fromAddress = `"${emailConfig.senderName || 'FlorenX System'}" <onboarding@resend.dev>`;
            }
        } else {
            if (!emailConfig.smtpEmail || !emailConfig.smtpPassword) {
                console.log("Error: Google SMTP config is missing.");
                return false;
            }
            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // dùng false cho port 587 (bắt buộc dùng TLS/STARTTLS)
                requireTLS: true,
                auth: {
                    user: emailConfig.smtpEmail,
                    pass: emailConfig.smtpPassword.replace(/\s+/g, '') // Tự động xóa khoảng trắng nếu người dùng nhập dư
                }
            });
        }

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return true;
    } catch (error) {
        console.log("Error sending email:", error);
        return false;
    }
}
