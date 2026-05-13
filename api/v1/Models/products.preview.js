const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema(
{
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    index: true
  },

  title: String,

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  user_name: String,

  rating: {
    type: Number,
    min: 1,
    max: 5
  },

  comment: String,

  images: {
    type: [String],
    default: []
  },

  updated: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

const ProductReview = mongoose.model(
  "ProductReview",
  productReviewSchema,
  "product_reviews"
);

module.exports = ProductReview;