const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/news.controller");
const validate = require("../../Validate/Admin/news.validate");
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
  "/",
  middleware.permissionMiddleWare("view_news"),
  controller.index
);

router.get(
  "/:slug",
  middleware.permissionMiddleWare("view_news"),
  controller.getBySlug
);

router.post(
  "/change-multi",
  middleware.permissionMiddleWare("update_news"),
  controller.changeMulti
);

router.post(
  "/create",
  middleware.permissionMiddleWare("create_news"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 }
  ]),
  validate.newsValidate,
  cloudinary.streamUpload,
  controller.create
);

router.post(
  "/update/:slug",
  middleware.permissionMiddleWare("update_news"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 }
  ]),
  validate.newsValidate,
  cloudinary.streamUpload,
  controller.update
);

module.exports = router;