const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true
    },

    product_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory"
    },

    description: {
      type: String,
      default: ""
    },

    price: {
      type: Number,
      default: 0
    },

    discountPercentage: {
      type: Number,
      default: 0
    },

    base_unit: {
      type: String,
      default: "cai",
      trim: true
    },

    low_stock_threshold: {
      type: Number,
      default: 5
    },

    is_combo: {
      type: Boolean,
      default: false
    },

    thumbnail: {
      type: String,
      default: ""
    },

    images: {
      type: [String],
      default: []
    },

    brand: {
      type: String,
      default: "",
      trim: true
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    featured: {
      type: String,
      enum: ["yes", "no"],
      default: "no"
    },

    position: {
      type: Number,
      default: 0
    },

    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true
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