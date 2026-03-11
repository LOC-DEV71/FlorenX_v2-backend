const express = require("express");
const router = express.Router();

const productRoutes = require("./products.routes");  
const rolesRoutes = require("./roles.routes");
const accountsRoutes = require("./accounts.routes");
const authRoutes = require("./auth.routes");
const productCategoriesRoutes = require("./product.categories.routes");


router.use("/products", productRoutes);
router.use("/product-categories", productCategoriesRoutes);
router.use("/roles", rolesRoutes);
router.use("/accounts", accountsRoutes);
router.use("/auth-admin", authRoutes);

module.exports = router;