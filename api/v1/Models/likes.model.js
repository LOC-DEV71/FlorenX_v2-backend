const  mongoose = require("mongoose")
const likeSchema = new mongoose.Schema(
  {
    clientId: String,
    productId: String,
  }, 
  {timestamps: true,}
);

const Like = mongoose.model("like", likeSchema, "like");

module.exports = Like;