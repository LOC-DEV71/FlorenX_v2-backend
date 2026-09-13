const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/orders.controller");

router.get("/get-list", controller.getList)
router.get("/get-total-spent", controller.getTotalSpent)
router.patch("/cancel-order/:id", controller.cancelOrder)

module.exports = router;