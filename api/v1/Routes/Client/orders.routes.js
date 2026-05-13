const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/orders.controller");

router.get("/get-list", controller.getList)

module.exports = router;