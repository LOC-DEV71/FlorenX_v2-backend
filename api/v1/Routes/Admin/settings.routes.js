const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/settings.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024
  }
});

const cloudinary = require("../../../../service/cloudinary.service");

router.get(
  "/detail",
  // middleware.permissionMiddleWare("view_settings"),
  controller.detail
);

router.patch(
  "/update",
  // middleware.permissionMiddleWare("edit_settings"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "bannerDesktop", maxCount: 1 },
    { name: "bannerMobile", maxCount: 1 }
  ]),
  cloudinary.streamUploadSetting,
  controller.update
);

module.exports = router;