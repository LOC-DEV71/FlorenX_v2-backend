const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Admin/settings.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require("../../../../service/cloudinary.service");

const middleware = require("../../Middleware/Admin/permission.middleware");

router.get("/detail", middleware.permissionMiddleWare("setting_management"), controller.detail);

router.patch(
  "/update",
  middleware.permissionMiddleWare("setting_management"),
  upload.any(),
  cloudinary.streamUploadSetting,
  controller.update
);

module.exports = router;