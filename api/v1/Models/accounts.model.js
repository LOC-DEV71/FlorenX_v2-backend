const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
    fullname: String,
    email: String,
    password: String,
    phone: String,
    avatar: String,
    role_slug: String,
    status: {
        type: String,
        default: ""
    },
    deleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        account_id: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    deletedBy: {
        account_id: String,
        deletedAt: Date
    },
    updatedBy: [
        {
            account_id: String,
            updatedAt: Date
        }
    ]
})

const Account = mongoose.model("Accounts", accountSchema, "accounts")
module.exports = Account;