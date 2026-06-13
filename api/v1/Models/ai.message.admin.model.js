const mongoose = require("mongoose");

const aiMessageAdminSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true
    },
    text: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ai_messages_admin", aiMessageAdminSchema);
