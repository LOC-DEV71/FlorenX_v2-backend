const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/auth.controller");
const validate = require("../../Validate/Admin/auth.validate")

router.post(
    "/login", 
    validate.authValidate,
    controller.login
)
router.get(
    "/get-admin", 
    controller.getAdmin
)
router.post(
    "/logout", 
    controller.logout
)

module.exports = router;