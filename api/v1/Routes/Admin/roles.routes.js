const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/role.controller");
const roleValidate = require("../../Validate/Admin/role.validate");


router.get("/", controller.index)

router.post(
    "/create", 
    roleValidate.roleValidate,
    controller.create
)

module.exports = router;