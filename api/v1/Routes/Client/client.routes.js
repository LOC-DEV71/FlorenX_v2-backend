const express = require("express");
const router = express.Router();

const productCategoriesRoutes = require("./product.categories.routes")

router.use("/product-categories", productCategoriesRoutes)

module.exports = router;