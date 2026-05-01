const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true
    },

    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true
    },

    text: {
      type: String,
      default: ""
    },

    images: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model("messages", messageSchema);
