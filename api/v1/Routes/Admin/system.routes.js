const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/system.controller");
const middleware = require("../../Middleware/admin/permission.middleware");

router.get("/", middleware.permissionMiddleWare("system_management"), controller.getSystemConfig);
router.patch("/", middleware.permissionMiddleWare("system_management"), controller.updateSystemConfig);
router.post("/test-email", middleware.permissionMiddleWare("system_management"), controller.testEmailConfig);
router.post("/request-secret-otp", middleware.permissionMiddleWare("system_management"), controller.requestSecretOtp);
router.post("/verify-secret-otp", middleware.permissionMiddleWare("system_management"), controller.verifySecretOtp);

module.exports = router;
