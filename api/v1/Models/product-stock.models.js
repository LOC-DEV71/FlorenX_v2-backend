const mongoose = require("mongoose");
const stockSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse"
  },
  quantity: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Stock", stockSchema);