const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/auth.controller");

router.post("/login/google", controller.googleLogin)
router.post("/logout", controller.logout)
router.get("/get-me", controller.getMe)
router.post("/update", controller.update)

module.exports = router;