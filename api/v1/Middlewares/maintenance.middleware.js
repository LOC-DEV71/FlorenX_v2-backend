const System = require("../Models/system.model");

module.exports.checkMaintenance = async (req, res, next) => {
    try {
        const system = await System.findOne({});
        if (!system || !system.maintenance) {
            return next();
        }

        const { blockAuth, blockCart, blockCheckout, blockOrders, blockReviews, blockAi } = system.maintenance;
        const originalUrl = req.originalUrl; // VD: /api/v1/client/auth/login

        const blockConfig = [
            { isBlocked: blockAuth, routeMatch: "/client/auth", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Tính năng Đăng nhập/Đăng ký tạm thời bị khóa bởi Quản trị viên." },
            { isBlocked: blockCart, routeMatch: "/client/cart", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Tính năng Thêm vào giỏ hàng tạm thời bị khóa." },
            { isBlocked: blockCheckout, routeMatch: "/client/checkout", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Tính năng Đặt hàng và Thanh toán tạm thời bị khóa." },
            { isBlocked: blockOrders, routeMatch: "/client/orders", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Quản lý Đơn hàng tạm thời bị khóa." },
            { isBlocked: blockReviews, routeMatch: "/client/product-preview", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Tính năng Đánh giá sản phẩm tạm thời bị khóa." },
            { isBlocked: blockAi, routeMatch: "/client/ai", message: "Hệ thống đang ở chế độ Chỉ Xem (View-only). Trợ lý ảo Veltrix-chan tạm thời nghỉ ngơi." }
        ];

        for (const config of blockConfig) {
            if (config.isBlocked && originalUrl.includes(config.routeMatch)) {
                return res.status(503).json({
                    code: false,
                    message: config.message,
                    maintenance: true
                });
            }
        }

        next();
    } catch (error) {
        console.error("Maintenance Middleware Error:", error);
        next();
    }
};
