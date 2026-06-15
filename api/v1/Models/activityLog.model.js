const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    fullname: {
      type: String,
      required: true
    },
    action: {
      type: String, // CREATE, UPDATE, DELETE
      required: true
    },
    module: {
      type: String, // e.g. "Sản phẩm", "Đơn hàng"
      required: true
    },
    description: {
      type: String, // Tiếng Việt thân thiện (VD: Admin A đã cập nhật đơn hàng X)
      required: true
    },
    endpoint: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema, "activity-logs");

module.exports = ActivityLog;
