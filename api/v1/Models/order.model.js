const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    code: String,
    fullname: String,
    address: String,
    phone: String,
    email: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "done", "cancel"],
      default: "pending"
    },

    voucher: String,

    pay: {
      type: String,
      enum: ["cod", "paypal"],
      default: "cod"
    },

    products: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        title: String,
        thumbnail: String,
        price: Number,
        discountPercentage: Number,
        quantity: Number,
        finalPrice: Number,
        slug: String
      }
    ],

    finalPrice: Number,
    totalPrice: Number,
    memberDiscount: Number,
    voucherDiscount: Number,
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model("order", orderSchema, "orders");

module.exports = Order;