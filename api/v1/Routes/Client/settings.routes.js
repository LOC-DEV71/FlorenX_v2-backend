const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Client/settings.controller");

router.get("/detail", controller.detail);

module.exports = router;
