const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/system.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require("../../../../service/cloudinary.service");

router.get("/", middleware.permissionMiddleWare("system_management"), controller.getSystemConfig);
router.patch(
  "/",
  middleware.permissionMiddleWare("system_management"),
  upload.fields([{ name: "botAvatar", maxCount: 1 }]),
  cloudinary.streamUploadBotAvatar,
  controller.updateSystemConfig
);
router.post("/test-email", middleware.permissionMiddleWare("system_management"), controller.testEmailConfig);
router.post("/request-secret-otp", middleware.permissionMiddleWare("system_management"), controller.requestSecretOtp);
router.post("/verify-secret-otp", middleware.permissionMiddleWare("system_management"), controller.verifySecretOtp);

module.exports = router;
