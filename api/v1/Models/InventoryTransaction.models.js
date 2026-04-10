const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["import", "export", "sale", "transfer", "adjustment"]
  },

  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },

  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse"
  },

  quantity: Number, // + hoặc -

  import_price: {
    type: Number,
    default: 0
  },

  ref_id: String, // id của phiếu (import/export/order...)
}, { timestamps: true });

module.exports = mongoose.model("InventoryTransaction", transactionSchema);