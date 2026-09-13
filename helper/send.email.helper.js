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

        let fromAddress = `"${emailConfig.senderName || 'FlorenX System'}" <${emailConfig.smtpEmail}>`;

        if (emailConfig.provider === 'resend') {
            if (!emailConfig.resendApiKey) {
                console.log("Error: Resend API Key is missing.");
                return false;
            }
            
            if(!emailConfig.smtpEmail) {
                fromAddress = `"${emailConfig.senderName || 'FlorenX System'}" <onboarding@resend.dev>`;
            }

            try {
                // Sử dụng REST API qua HTTPS (Port 443) để vượt Firewall 100%
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${emailConfig.resendApiKey.replace(/\s+/g, '')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: fromAddress,
                        to: email,
                        subject: subject,
                        html: html
                    })
                });

                if (response.ok) {
                    console.log('Email sent via Resend API');
                    return true;
                } else {
                    const errorData = await response.json();
                    console.log("Resend API Error:", errorData);
                    return false;
                }
            } catch (error) {
                console.log("Fetch Error (Resend):", error);
                return false;
            }

        } else {
            if (!emailConfig.smtpEmail || !emailConfig.smtpPassword) {
                console.log("Error: Google SMTP config is missing.");
                return false;
            }
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // dùng false cho port 587 (bắt buộc dùng TLS/STARTTLS)
                requireTLS: true,
                auth: {
                    user: emailConfig.smtpEmail,
                    pass: emailConfig.smtpPassword.replace(/\s+/g, '') // Tự động xóa khoảng trắng nếu người dùng nhập dư
                }
            });

            const mailOptions = {
                from: fromAddress,
                to: email,
                subject: subject,
                html: html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent via Google SMTP:', info.response);
            return true;
        }
    } catch (error) {
        console.log("Error sending email:", error);
        return false;
    }
}
