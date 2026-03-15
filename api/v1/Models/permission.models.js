const mongoose = require("mongoose");

const permissonSchema = new mongoose.Schema({
    title: {
      type: String, 
      required: true
    },
    key: {
      type: String,
      required: true,
      unique: true
    },
    description: String,
    permissions: [
      {
        label: {
          type: String,
          required: true
        },
        value: {
          type: String,
          required: true
        }
      }
    ],
})

const Permission = mongoose.model("Permission", permissonSchema, "permissions")
module.exports = Permission;