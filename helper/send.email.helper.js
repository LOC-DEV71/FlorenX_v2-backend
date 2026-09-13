const nodemailer = require('nodemailer');
const System = require("../api/v1/Models/system.model");

module.exports.sendMail = async (email, subject, html) => {
    try {
        const systemConfig = await System.findOne({});
        const emailConfig = systemConfig?.email;

        if (!emailConfig || !emailConfig.smtpEmail || !emailConfig.smtpPassword) {
            console.log("Error: SMTP Email is not configured in System Settings.");
            return false;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: emailConfig.smtpEmail,
                pass: emailConfig.smtpPassword.replace(/\s+/g, '') // Tự động xóa khoảng trắng nếu người dùng nhập dư
            }
        });

        const mailOptions = {
            from: `"${emailConfig.senderName || 'FlorenX System'}" <${emailConfig.smtpEmail}>`,
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
