const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
{
  title: String,

  product_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory"
  },

  description: String,

  price: Number,

  discountPercentage: {
    type: Number,
    default: 0
  },

  stock: Number,

  thumbnail: String,

  images: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  featured: {
    type: Boolean,
    default: false
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

  specs: {
    type: Map,
    of: String,
    default: {}
  },

  rating_avg: {
    type: Number,
    default: 0
  },

  rating_count: {
    type: Number,
    default: 0
  },

  createdBy: {
    account_id: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  },

  deleted: {
    type: Boolean,
    default: false
  },

  deletedBy: {
    account_id: String,
    deletedAt: Date
  },

  updatedBy: [
    {
      account_id: String,
      updatedAt: Date
    }
  ]

},
{ timestamps: true }
);

const Product = mongoose.model("Product", productSchema, "products");

module.exports = Product;