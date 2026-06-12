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
      lastResetDate: { type: Date, default: Date.now }
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
      smtpEmail: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      senderName: { type: String, default: 'FlorenX System' }
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
