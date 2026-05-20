const mongoose = require("mongoose");
const newsSchema = new mongoose.Schema(
    {
        // Nội dung
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: [
                "order_new",          // đơn hàng mới
                "order_status",       // cập nhật trạng thái đơn hàng
                "product_low_stock",  // sản phẩm sắp hết hàng
                "product_out_stock",  // sản phẩm hết hàng
                "user_register",      // người dùng mới đăng ký
                "rating",            // bình luận bài viết
                "cskh",               // ticket CSKH mới
                "system",             // thông báo hệ thống
            ],
            required: true,
        },

        // Liên kết đến đối tượng liên quan
        reference_type: {
            type: String,
            enum: ["Order", "Product", "User", "Post", null],
            default: null,
        },
        reference_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

        // URL điều hướng khi click
        action_url: {
            type: String,
            default: null,
        },

        // Trạng thái đọc
        is_read: {
            type: Boolean,
            default: false,
        },
        read_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true
    }
);

const Notification = mongoose.model("Notification", newsSchema, "notifications");

module.exports = Notification;