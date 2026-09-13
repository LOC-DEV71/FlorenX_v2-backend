const mongoose = require("mongoose");

const systemSchema = new mongoose.Schema(
  {
    // Dòng tiền & Vận chuyển
    banks: [
      {
        bankName: String,
        accountNumber: String,
        accountName: String,
        qrCode: { type: String, default: "" }, // QR Code URL
        status: { type: Boolean, default: true }
      }
    ],
    shipping: {
      defaultFee: { type: Number, default: 30000 },
      freeShippingThreshold: { type: Number, default: 500000 }
    },
    
    // Cấu hình AI
    ai: {
      status: { type: Boolean, default: true },
      apiKey: { type: String, default: '' },
      model: { type: String, default: 'gemini-2.0-flash' },
      prompt: { type: String, default: 'Tên bạn là Veltrix-chan, trợ lý ảo của cửa hàng FlorenX. Hãy trả lời khách hàng một cách thân thiện, nhiệt tình, sử dụng emoji dễ thương và luôn tư vấn chốt đơn nhanh nhất.' },
      requestsToday: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
      autoProcessOrders: { type: Boolean, default: false }, // Bật/tắt duyệt đơn tự động
      autoSystemMonitor: { type: Boolean, default: false }, // Bật/tắt chế độ giám sát toàn hệ thống
      botAvatar: { type: String, default: '' } // Avatar hiển thị khi AI trả lời đánh giá
    },
    
    // Danh sách các Model AI có thể sử dụng
    aiModels: [
      {
        code: { type: String }, // Mã model API (VD: gemini-3.5-flash)
        name: { type: String }, // Tên hiển thị
        dailyLimit: { type: Number } // Giới hạn số lượng tin nhắn mỗi ngày
      }
    ],
    
    // Cấu hình Email SMTP
    email: {
      provider: { type: String, enum: ['google', 'resend'], default: 'google' },
      smtpEmail: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      resendApiKey: { type: String, default: '' },
      senderName: { type: String, default: 'FlorenX System' }
    },
    
    // Định danh & Truy cập (IAM)
    iam: {
      googleStatus: { type: Boolean, default: true },
      googleClientId: { type: String, default: '' },
      jwtExpiresIn: { type: Number, default: 7 },
      jwtSecret: { type: String, default: 'FlorenxSecretKey2026' },
      pwdMinLength: { type: Number, default: 8 },
      pwdRequireSpecial: { type: Boolean, default: true }
    },
    
    // Đa phương tiện (Media)
    media: {
      cloudinaryStatus: { type: Boolean, default: true },
      cloudinaryCloudName: { type: String, default: '' },
      cloudinaryApiKey: { type: String, default: '' },
      cloudinaryApiSecret: { type: String, default: '' }
    },
    
    // Cổng Thanh Toán (Payment)
    payment: {
      paypalStatus: { type: Boolean, default: true },
      paypalClientId: { type: String, default: '' },
      paypalClientSecret: { type: String, default: '' },
      bankTransferStatus: { type: Boolean, default: true }
    },
    
    // Chính sách & Thuế
    policy: {
      vatEnabled: { type: Boolean, default: false },
      vatPercent: { type: Number, default: 8 },
      pointEarnRatio: { type: Number, default: 10000 }, // 10k VND = 1 Điểm
      pointRedeemRatio: { type: Number, default: 100 }  // 1 Điểm = 100 VND
    }
  },
  {
    timestamps: true
  }
);

const System = mongoose.model("System", systemSchema, "systems");

module.exports = System;
