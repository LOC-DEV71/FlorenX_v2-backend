const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    title: { type: String, default: "" },
    desc: { type: String, default: "" },
    tag: { type: String, default: "" },
    link: { type: String, default: "" },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hero", heroSchema, "heroes");
