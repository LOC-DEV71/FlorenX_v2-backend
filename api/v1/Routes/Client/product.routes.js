const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/product.controller");

router.get("/cross-sell", controller.getCrossSellProducts);
router.get("/:category", controller.getProductByCategory);
router.get("/detail/:slug", controller.getProductBySlug);
router.get("/sale/:category", controller.getProductBySale);

module.exports = router;