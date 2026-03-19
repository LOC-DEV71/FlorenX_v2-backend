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


router.use("/products", productRoutes);
router.use("/product-categories", productCategoriesRoutes);
router.use("/roles", rolesRoutes);
router.use("/accounts", accountsRoutes);
router.use("/auth-admin", authRoutes);
router.use("/permission", permissionRoutes);
router.use("/news-category", newsCategoryRoutes);
router.use("/news", newsRoutes);

module.exports = router;