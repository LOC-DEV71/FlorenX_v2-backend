const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/product.controller");

router.get("/:category", controller.getProductByCategory);
router.get("/detail/:slug", controller.getProductBySlug);

module.exports = router;