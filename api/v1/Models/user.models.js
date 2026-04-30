const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  phone: String,
  status: {
    type: String,
    default: "active"
  },
  member: {
    type: String,
    enum: ["bronze", "silver", "gold", "diamond"],
    default: "bronze"
  },
  avatar: String,
  address: String,
  statusOnline: String,
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, { timestamps: true });

const User = mongoose.model("User", userSchema, "users");

module.exports = User;