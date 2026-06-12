const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },

    sender: {
      type: String,
      enum: ["user", "bot"],
      required: true
    },

    text: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ai_messages", aiMessageSchema);
