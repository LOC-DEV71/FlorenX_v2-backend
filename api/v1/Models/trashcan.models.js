const mongoose = require("mongoose");

const trashSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["product", "role", "account","product_category", "new", "news_category"]
        },
        itemId: String,
        title: {
            type: String,
            default: ""
        },
        slug: {
            type: String,
            default: ""
        },
        deletedAt: {
            type: Date,
            default: Date.now
        },
        deletedBy: {
            type: String,
            default: null
        },
    },
    {
        timestamps: true
    }
);
const Trash = mongoose.model("Trash", trashSchema, "trash");
module.exports = Trash;