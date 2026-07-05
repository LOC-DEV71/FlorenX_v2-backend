const mongoose = require("mongoose");

const categoryBannerSchema = new mongoose.Schema(
  {
    categorySlug: { type: String, default: "" }, 
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CategoryBanner", categoryBannerSchema, "category_banners");
