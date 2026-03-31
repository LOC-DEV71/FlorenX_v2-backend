const express = require("express");
const router = express.Router();

const productCategoriesRoutes = require("./product.categories.routes")
const newsRoutes = require("./news.routes")
const productRoutes = require("./product.routes")
const loginRoutes = require("./auth.client.routes")

router.use("/product-categories", productCategoriesRoutes)
router.use("/news", newsRoutes)
router.use("/products", productRoutes)
router.use("/auth", loginRoutes)

module.exports = router;