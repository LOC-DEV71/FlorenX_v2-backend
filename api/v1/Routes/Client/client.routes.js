const express = require("express");
const router = express.Router();

const productCategoriesRoutes = require("./product.categories.routes")
const newsRoutes = require("./news.routes")
const productRoutes = require("./product.routes")
const loginRoutes = require("./auth.client.routes")
const cartRoutes = require("./cart.routes")
const likeRoutes = require("./like.routes")

router.use("/product-categories", productCategoriesRoutes)
router.use("/news", newsRoutes)
router.use("/products", productRoutes)
router.use("/auth", loginRoutes)
router.use("/cart", cartRoutes)
router.use("/like", likeRoutes)

module.exports = router;