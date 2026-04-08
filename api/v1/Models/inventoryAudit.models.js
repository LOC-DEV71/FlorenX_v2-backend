const mongoose = require("mongoose");

const inventoryAuditSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true
  },
  audit_date: Date,
  created_by: String,
  note: String,
  items: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      system_qty: {
        type: Number,
        default: 0
      },
      actual_qty: {
        type: Number,
        default: 0
      },
      diff_qty: {
        type: Number,
        default: 0
      },
      status: {
        type: String,
        enum: ["Khớp", "Dư", "Thiếu", "Chưa kiểm"],
        default: "Chưa kiểm"
      }
    }
  ],
  confirmed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("InventoryAudit", inventoryAuditSchema);