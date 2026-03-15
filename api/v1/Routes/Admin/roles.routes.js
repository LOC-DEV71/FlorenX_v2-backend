const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/role.controller");
const roleValidate = require("../../Validate/Admin/role.validate");


router.get("/", controller.index)
router.get("/:slug", controller.getRoleBySlug)

router.post(
    "/create", 
    roleValidate.roleValidate,
    controller.create
)
router.post(
    "/update/:slug", 
    roleValidate.updateRoleValidate,
    controller.update
)
router.post(
    "/change-multi", 
    controller.changeMulti
)

module.exports = router;