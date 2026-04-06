const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/auth.controller");
const validate = require("../../Validate/client/auth.validate");

router.post("/login/google", controller.googleLogin)
router.post("/login/local", validate.loginLocal, controller.logLocal)
router.post("/logout", controller.logout)
router.post("/forgot-password", controller.forgotPassword)
router.post("/forgot-password-otp", controller.forgotPasswordOtp)
router.post("/reset-password", validate.resetPassword, controller.resetPassword)
router.get("/get-me", controller.getMe)
router.post("/update", controller.update)
router.post(
    "/create", 
    validate.authValidate,
    controller.create
)
router.post(
    "/cofirm-otp", 
    controller.confirm
)

module.exports = router;