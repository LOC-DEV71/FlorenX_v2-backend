const express = require("express");
const router = express.Router();

const productRoutes = require("./products.routes");  
const rolesRoutes = require("./roles.routes");
const accountsRoutes = require("./accounts.routes");
const authRoutes = require("./auth.routes");
const productCategoriesRoutes = require("./product.categories.routes");
const permissionRoutes = require("./permission.routes.js")
const newsCategoryRoutes = require("./news.category.routes.js")
const newsRoutes = require("./news.routes.js")
const trashCanRoutes = require("./trashcan.routes.js")
const settingsRoutes = require("./settings.routes.js")
const inventoryRoutes = require("./inventoryRoutes.routes.js")
const warehouseRoutes = require("./warehouse.routes.js")
const inventoryAuditRoutes = require("./inventory.audit.routes.js")
const vouchersRoutes = require("./vouchers.routes.js")
const ordersRoutes = require("./order.routes.js")
const roomchatsRoutes = require("./roomchat.routes.js")
const usersRoutes = require("./users.routes.js")
const notificationsRoutes = require("./notifications.routes.js")

router.use("/products", productRoutes);
router.use("/product-categories", productCategoriesRoutes);
router.use("/roles", rolesRoutes);
router.use("/accounts", accountsRoutes);
router.use("/auth-admin", authRoutes);
router.use("/permission", permissionRoutes);
router.use("/news-category", newsCategoryRoutes);
router.use("/news", newsRoutes);
router.use("/trashcan", trashCanRoutes);
router.use("/settings", settingsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/inventory-audit", inventoryAuditRoutes);
router.use("/vouchers", vouchersRoutes);
router.use("/orders", ordersRoutes);
router.use("/room-chat", roomchatsRoutes);
router.use("/users", usersRoutes);
router.use("/notifications", notificationsRoutes);

module.exports = router;