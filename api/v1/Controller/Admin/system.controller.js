const System = require("../../Models/system.model");
const Otp = require("../../Models/otp.model");
const Account = require("../../Models/accounts.model");
const formSendMail = require("../../../../helper/formSendMail");
const jwtUtils = require("../../../../utils/jwt.utils");

// [GET] /api/v1/admin/system
module.exports.getSystemConfig = async (req, res) => {
  try {
    let system = await System.findOne({});
    
    // Singleton: Nếu chưa có thì tạo cái đầu tiên mặc định
    if (!system) {
      system = await System.create({});
    }

    const systemData = system.toObject();

    // Mask sensitive fields
    if (systemData.ai && systemData.ai.apiKey) {
      systemData.ai.apiKey = '************************';
    }
    if (systemData.email && systemData.email.smtpPassword) {
      systemData.email.smtpPassword = '************************';
    }
    if (systemData.iam && systemData.iam.googleClientId) {
      systemData.iam.googleClientId = '************************';
    }
    if (systemData.iam && systemData.iam.jwtSecret) {
      systemData.iam.jwtSecret = '************************';
    }
    if (systemData.media && systemData.media.cloudinaryApiKey) {
      systemData.media.cloudinaryApiKey = '********';
    }
    if (systemData.media && systemData.media.cloudinaryApiSecret) {
      systemData.media.cloudinaryApiSecret = '********';
    }
    if (systemData.payment && systemData.payment.paypalClientSecret) {
      systemData.payment.paypalClientSecret = '********';
    }

    res.json({
      code: 200,
      message: "Lấy cấu hình hệ thống thành công",
      data: systemData,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi khi lấy cấu hình hệ thống",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/admin/system
module.exports.updateSystemConfig = async (req, res) => {
  try {
    const updateData = req.body;
    let system = await System.findOne({});

    if (!system) {
      system = await System.create({});
    }

    if (updateData.ai) {
      if (updateData.ai.apiKey === '************************') {
        updateData.ai.apiKey = system.ai.apiKey; // Keep original
      }
      system.ai = { ...system.toObject().ai, ...updateData.ai };
    }

    if (updateData.email) {
      if (updateData.email.smtpPassword === '************************') {
        updateData.email.smtpPassword = system.email.smtpPassword; // Keep original
      }
      system.email = { ...system.toObject().email, ...updateData.email };
    }

    if (updateData.iam) {
      if (updateData.iam.googleClientId === '************************') {
        updateData.iam.googleClientId = system.iam.googleClientId;
      }
      if (updateData.iam.jwtSecret === '************************') {
        updateData.iam.jwtSecret = system.iam.jwtSecret;
      }
      system.iam = { ...system.toObject().iam, ...updateData.iam };
    }

    if (updateData.media) {
      if (updateData.media.cloudinaryApiKey === '************************') {
        updateData.media.cloudinaryApiKey = system.media.cloudinaryApiKey;
      }
      if (updateData.media.cloudinaryApiSecret === '************************') {
        updateData.media.cloudinaryApiSecret = system.media.cloudinaryApiSecret;
      }
      system.media = { ...system.toObject().media, ...updateData.media };
    }

    if (updateData.payment) {
      if (updateData.payment.paypalClientSecret === '********') {
        updateData.payment.paypalClientSecret = system.payment.paypalClientSecret;
      }
      system.payment = { ...system.toObject().payment, ...updateData.payment };
    }

    if (updateData.policy) {
      system.policy = { ...system.toObject().policy, ...updateData.policy };
    }

    if (updateData.banks) {
      system.banks = updateData.banks;
    }

    if (updateData.shipping) {
      system.shipping = { ...system.toObject().shipping, ...updateData.shipping };
    }
    
    if (updateData.aiModels) {
      system.aiModels = updateData.aiModels;
    }

    await system.save();

    res.json({
      code: 200,
      message: "Cập nhật cấu hình hệ thống thành công",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi khi cập nhật cấu hình hệ thống",
      error: error.message,
    });
  }
};

const sendMailHelper = require("../../../../helper/send.email.helper");

// [POST] /api/v1/admin/system/test-email
module.exports.testEmailConfig = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ code: 400, message: "Vui lòng cung cấp email nhận test" });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3b82f6; text-align: center;">FlorenX - Test Email System</h2>
        <p>Xin chào,</p>
        <p>Nếu bạn nhận được email này, có nghĩa là hệ thống <strong>Máy chủ Email (SMTP)</strong> của hệ thống FlorenX đã được thiết lập thành công!</p>
        <p>Từ giờ, hệ thống có thể tự động gửi các email như Khôi phục mật khẩu, Xác nhận đơn hàng, v.v...</p>
        <br/>
        <p>Trân trọng,<br/><strong>Đội ngũ IT FlorenX</strong></p>
      </div>
    `;

    const success = await sendMailHelper.sendMail(email, "🎉 FlorenX - Xác nhận cấu hình Email thành công!", html);

    if (success) {
      res.json({ code: 200, message: "Gửi email test thành công. Vui lòng kiểm tra hộp thư!" });
    } else {
      res.json({ code: 400, message: "Gửi email thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu ứng dụng SMTP." });
    }
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi hệ thống khi gửi email",
      error: error.message,
    });
  }
};

// [POST] /api/v1/admin/system/request-secret-otp
module.exports.requestSecretOtp = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.json({ code: 401, message: "Không tìm thấy token." });

    const decoded = await jwtUtils.verifyToken(token);
    const admin = await Account.findOne({ _id: decoded.id, deleted: false }).lean();
    if (!admin || !admin.email) return res.json({ code: 400, message: "Không tìm thấy Email của Admin." });

    // Sinh OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOtp = new Otp({
      email: admin.email,
      otp: otpCode,
      type: "view_secret",
      expireAt: new Date(Date.now() + 5 * 60 * 1000) // 5 phút
    });
    await newOtp.save();

    await formSendMail.formSendMail(admin.email, otpCode);

    res.json({ code: 200, message: `Mã OTP đã được gửi về email ${admin.email}` });
  } catch (error) {
    res.json({ code: 400, message: "Lỗi khi gửi OTP", error: error.message });
  }
};

// [POST] /api/v1/admin/system/verify-secret-otp
module.exports.verifySecretOtp = async (req, res) => {
  try {
    const { otp, field } = req.body; // field = 'apiKey' hoặc 'smtpPassword'
    if (!otp || !field) return res.json({ code: 400, message: "Thiếu dữ liệu" });

    const token = req.cookies.token;
    if (!token) return res.json({ code: 401, message: "Không tìm thấy token." });

    const decoded = await jwtUtils.verifyToken(token);
    const admin = await Account.findOne({ _id: decoded.id, deleted: false }).lean();
    if (!admin || !admin.email) return res.json({ code: 400, message: "Không tìm thấy Admin." });

    const existOtp = await Otp.findOne({ email: admin.email, otp: otp });
    if (!existOtp) {
      return res.json({ code: 400, message: "Mã OTP không hợp lệ hoặc đã hết hạn." });
    }

    // OTP đúng -> Lấy mã thật từ DB
    const system = await System.findOne({});
    let secretValue = "";
    if (field === "apiKey") secretValue = system?.ai?.apiKey || "";
    if (field === "smtpPassword") secretValue = system?.email?.smtpPassword || "";
    if (field === "googleClientId") secretValue = system?.iam?.googleClientId || "";
    if (field === "jwtSecret") secretValue = system?.iam?.jwtSecret || "";
    if (field === "cloudinaryApiKey") secretValue = system?.media?.cloudinaryApiKey || "";
    if (field === "cloudinaryApiSecret") secretValue = system?.media?.cloudinaryApiSecret || "";
    if (field === "paypalClientSecret") secretValue = system?.payment?.paypalClientSecret || "";

    // Xóa OTP
    await Otp.deleteOne({ _id: existOtp._id });

    res.json({ code: 200, message: "Xác thực thành công", data: secretValue });
  } catch (error) {
    res.json({ code: 400, message: "Lỗi hệ thống", error: error.message });
  }
};
