const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/cart.controller");

router.post("/add-to-cart", controller.addToCart);
router.get("/", controller.getCart);
router.post("/update-quantity", controller.updateQuantity);

module.exports = router;