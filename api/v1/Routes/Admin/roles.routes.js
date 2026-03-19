const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/role.controller");
const roleValidate = require("../../Validate/Admin/role.validate");
const middleware = require("../../Middleware/Admin/permission.middleware")

router.get(
    "/", 
    middleware.permissionMiddleWare("view_roles"),
    controller.index
)
router.get(
    "/:slug", 
    middleware.permissionMiddleWare("view_roles"),
    controller.getRoleBySlug
)

router.post(
    "/create", 
    middleware.permissionMiddleWare("create_roles"),
    roleValidate.roleValidate,
    controller.create
)
router.post(
    "/update/:slug", 
    middleware.permissionMiddleWare("update_roles"),
    roleValidate.updateRoleValidate,
    controller.update
)
router.post(
    "/change-multi", 
    middleware.permissionMiddleWare("update_roles"),
    controller.changeMulti
)

module.exports = router;