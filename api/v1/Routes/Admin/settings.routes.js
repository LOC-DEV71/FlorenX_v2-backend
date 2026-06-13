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
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "bannerDesktop", maxCount: 1 },
    { name: "bannerMobile", maxCount: 1 },
    { name: "sectionHeroImages", maxCount: 20 },
    { name: "sectionHeroSliderImages", maxCount: 50 }
  ]),
  cloudinary.streamUploadSetting,
  controller.update
);

module.exports = router;