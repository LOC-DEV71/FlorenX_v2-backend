const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  name: String,
  address: String
}, { timestamps: true });

module.exports = mongoose.model("Warehouse", warehouseSchema);