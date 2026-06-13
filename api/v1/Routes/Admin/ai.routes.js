const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Admin/ai.controller");

router.get("/history", controller.history);
router.post("/chat", controller.chat);

module.exports = router;
