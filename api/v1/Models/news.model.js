const mongoose = require("mongoose");
const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    description: String,
    thumbnail: {
      type: String,
      default: ""
    },
    slug_category: String,
    status: {
      type: String,
      enum: ["draft", "published", "hidden"],
      default: "draft"
    },
    featured: {
      type: String,
      enum: ["yes", "no"],
      default: "no"
    },
    views: {
      type: Number,
      default: 0
    },
    deleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      account_id: String,
      fullname: String
    },
    updatedBy: {
      account_id: String,
      fullname: String
    }
  },
  {
    timestamps: true
  }
);

const News = mongoose.model("News", newsSchema, "news");

module.exports = News;