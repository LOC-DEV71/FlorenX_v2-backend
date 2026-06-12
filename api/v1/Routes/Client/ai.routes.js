const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Client/ai.controller");

router.post("/chat", controller.chat);
router.get("/history/:sessionId", controller.getHistory);

module.exports = router;
