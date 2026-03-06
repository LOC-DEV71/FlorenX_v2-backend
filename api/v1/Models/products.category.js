const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
{
  title: String,

  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory",
    default: null
  },

  description: String,

  thumbnail: String,

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  position: {
    type: Number,
    default: 0
  },

  slug: {
    type: String,
    unique: true,
    index: true
  },

  deleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date

},
{ timestamps: true }
);

const ProductCategory = mongoose.model(
  "ProductCategory",
  productCategorySchema,
  "product_categories"
);

module.exports = ProductCategory;