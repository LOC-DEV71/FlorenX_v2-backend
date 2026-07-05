const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Client/tiers.controller");

router.get("/", controller.index);

module.exports = router;
