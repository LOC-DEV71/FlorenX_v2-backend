const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Client/checkout.controller");
const validate = require("../../Validate/client/order.validate");

router.post("/paypal/create-order", controller.createOrder);
router.post("/paypal/capture-order", controller.captureOrder);
router.post("/order", validate.orderValidate, controller.order);
router.get("/order/detail/:orderCode", controller.getDetailOrder);

module.exports = router;