const  mongoose = require("mongoose")

const newsCategorySchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: "",
      trim: true
    },
    thumbnail: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    deleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      account_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null
      },
      fullname: {
        type: String,
        default: ""
      }
    },
    updatedBy: {
      account_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null
      },
      fullname: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

const NewsCategory = mongoose.model("NewsCategory", newsCategorySchema, "newsCategory")

module.exports = NewsCategory;