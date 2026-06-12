const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/system.controller");

router.get("/", controller.getSystemConfig);
router.patch("/", controller.updateSystemConfig);

module.exports = router;
