const mongoose = require("mongoose");

const tierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, 
    slug: { type: String, required: true, unique: true }, 
    discountRate: { type: Number, default: 0 }, 
    maxDiscount: { type: Number, default: 0 }, 
    minOrderValue: { type: Number, default: 0 }, 
    conditionTotalSpent: { type: Number, default: 0 }, 
    description: { type: String, default: "" },
    status: { type: String, default: "active" },
    deleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tier", tierSchema, "tiers");
