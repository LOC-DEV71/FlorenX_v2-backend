const sendMailHelper = require("./send.email.helper");
module.exports.formSendMail = async (email, otp) => {
    const subject = `Mã OTP xác minh: ${otp}`;

    const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Veltrix Gear OTP</title>
        </head>
        <body style="margin:0; padding:0; background:#edf2f7; font-family:Arial, Helvetica, sans-serif;">
        <div style="padding:32px 16px;">
            <div style="
            max-width:600px;
            margin:0 auto;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            border:1px solid #e2e8f0;
            box-shadow:0 12px 32px rgba(15,23,42,0.08);
            ">
            
            <!-- Header -->
            <div style="
                background:linear-gradient(135deg, #020617 0%, #0f172a 100%);
                padding:28px 24px;
                text-align:center;
            ">
                <img
                src="https://res.cloudinary.com/dfzgowb54/image/upload/v1774025233/cvrjda3vfurqciminexe.png"
                alt="Veltrix Gear"
                style="height:54px; display:block; margin:0 auto 14px;"
                />
                <div style="
                color:#cbd5e1;
                font-size:13px;
                letter-spacing:1.5px;
                text-transform:uppercase;
                ">
                Bảo mật tài khoản
                </div>
            </div>

            <!-- Body -->
            <div style="padding:34px 30px 30px;">
                <h1 style="
                margin:0 0 10px;
                font-size:28px;
                line-height:1.3;
                color:#0f172a;
                text-align:center;
                ">
                Mã OTP xác nhận
                </h1>

                <div style="
                width:56px;
                height:4px;
                border-radius:999px;
                background:linear-gradient(90deg, #0ea5e9, #38bdf8);
                margin:0 auto 24px;
                "></div>

                <p style="
                margin:0 0 14px;
                color:#475569;
                font-size:15px;
                line-height:1.8;
                text-align:center;
                ">
                Xin chào,
                </p>

                <p style="
                margin:0 0 22px;
                color:#475569;
                font-size:15px;
                line-height:1.8;
                text-align:center;
                ">
                Đây là mã OTP để xác thực tài khoản của bạn tại
                <strong style="color:#0f172a;">Veltrix Gear</strong>.
                </p>

                <!-- OTP box -->
                <div style="
                margin:0 0 24px;
                padding:24px 16px;
                background:linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
                border:1px solid #bae6fd;
                border-radius:18px;
                text-align:center;
                ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                    letter-spacing:1.2px;
                    text-transform:uppercase;
                    margin-bottom:10px;
                ">
                    Mã xác thực của bạn
                </div>

                <div style="
                    font-size:36px;
                    line-height:1;
                    font-weight:700;
                    letter-spacing:8px;
                    color:#0284c7;
                ">
                    ${otp}
                </div>
                </div>

                <!-- Info box -->
                <div style="
                background:#f8fafc;
                border:1px solid #e2e8f0;
                border-radius:14px;
                padding:16px 18px;
                margin-bottom:22px;
                ">
                <p style="
                    margin:0 0 8px;
                    color:#334155;
                    font-size:14px;
                    line-height:1.7;
                ">
                    Mã OTP sẽ hết hạn sau <strong>5 phút</strong>.
                </p>
                <p style="
                    margin:0;
                    color:#334155;
                    font-size:14px;
                    line-height:1.7;
                ">
                    Vì lý do bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.
                </p>
                </div>

                <p style="
                margin:0;
                color:#64748b;
                font-size:13px;
                line-height:1.8;
                text-align:center;
                ">
                Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.
                </p>
            </div>

            <!-- Footer -->
            <div style="
                padding:18px 24px;
                background:#f8fafc;
                border-top:1px solid #e2e8f0;
                text-align:center;
            ">
                <div style="
                color:#0f172a;
                font-size:13px;
                font-weight:600;
                margin-bottom:6px;
                ">
                Veltrix Gear
                </div>
                <div style="
                color:#94a3b8;
                font-size:12px;
                line-height:1.6;
                ">
                © 2026 Veltrix Gear. All rights reserved.
                </div>
            </div>

            </div>
        </div>
        </body>
        </html>
    `;

    sendMailHelper.sendMail(email, subject, html);
}
