const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/product.controller");

router.get("/:category", controller.getProductByCategory);

module.exports = router;