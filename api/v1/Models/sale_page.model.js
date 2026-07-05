const mongoose = require("mongoose");

const salePageSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["hero", "section"], required: true },
    mediaUrl: { type: String, default: "" }, // Can be video or image URL
    title: { type: String, default: "" },
    desc: { type: String, default: "" },
    tag: { type: String, default: "" },
    tagClassName: { type: String, default: "" }, // For sections styling
    link: { type: String, default: "" }, // Primarily for Hero "Mua ngay"
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalePage", salePageSchema, "sale_pages");
