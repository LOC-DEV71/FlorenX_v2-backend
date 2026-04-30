const mongoose = require("mongoose");
const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },

  discountValue: {
    type: Number,
    required: true
  },

  maxDiscount: {
    type: Number,
    default: null
  },

  minOrderValue: {
    type: Number,
    default: 0
  },

  quantity: {
    type: Number,
    default: 1
  },

  usedCount: {
    type: Number,
    default: 0
  },

  startDate: {
    type: Date
  },

  endDate: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

const Voucher = mongoose.model("Voucher", voucherSchema);
module.exports = Voucher;