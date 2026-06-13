const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Admin/ai.controller");

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024
  }
});

const cloudinary = require("../../../../service/cloudinary.service");

router.get("/history", controller.history);
router.post("/chat", upload.array('files', 5), controller.chat);

module.exports = router;
