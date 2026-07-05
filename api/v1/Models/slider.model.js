const mongoose = require("mongoose");

const sliderSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    title: { type: String, default: "" },
    tag: { type: String, default: "" },
    link: { type: String, default: "" },
    order: { type: Number, default: 0 } 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Slider", sliderSchema, "sliders");
