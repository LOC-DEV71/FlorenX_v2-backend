const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/system.controller");

router.get("/", controller.getSystemConfig);
router.patch("/", controller.updateSystemConfig);
router.post("/test-email", controller.testEmailConfig);
router.post("/request-secret-otp", controller.requestSecretOtp);
router.post("/verify-secret-otp", controller.verifySecretOtp);

module.exports = router;
