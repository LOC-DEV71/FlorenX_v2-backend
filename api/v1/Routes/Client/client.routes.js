const express = require("express");
const router = express.Router();

const productCategoriesRoutes = require("./product.categories.routes")
const newsRoutes = require("./news.routes")
const productRoutes = require("./product.routes")
const loginRoutes = require("./auth.client.routes")
const cartRoutes = require("./cart.routes")
const likeRoutes = require("./like.routes")
const voucherRoutes = require("./vouchers.routes");
const checkoutRoutes = require("./checkout.routes");
const ordersRoutes = require("./orders.routes");
const productPreviewRoutes = require("./product.preview.routes");
const aiRoutes = require("./ai.routes");
const settingsRoutes = require("./settings.routes");
const tiersRoutes = require("./tiers.routes");

const { checkMaintenance } = require("../../Middlewares/maintenance.middleware");

// Những route không cần chặn (Sản phẩm, danh mục, tin tức...)
router.use("/product-categories", productCategoriesRoutes)
router.use("/news", newsRoutes)
router.use("/products", productRoutes)
router.use("/settings", settingsRoutes)
router.use("/member-tiers", tiersRoutes)

// Những route sẽ bị chặn nếu admin bật tính năng bảo trì
router.use("/auth", checkMaintenance, loginRoutes)
router.use("/cart", checkMaintenance, cartRoutes)
router.use("/checkout", checkMaintenance, checkoutRoutes)
router.use("/orders", checkMaintenance, ordersRoutes)
router.use("/product-preview", checkMaintenance, productPreviewRoutes)
router.use("/ai", checkMaintenance, aiRoutes)

// Không đưa vào mảng block: like, vouchers
router.use("/like", likeRoutes)
router.use("/vouchers", voucherRoutes)

module.exports = router;