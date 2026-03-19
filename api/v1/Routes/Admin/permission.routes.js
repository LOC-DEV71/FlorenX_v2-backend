const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/permission.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");


router.get(
    "/", 
    middleware.permissionMiddleWare("view_permissions"),
    controller.index
)
router.post(
    "/change", 
    middleware.permissionMiddleWare("update_permissions"),
    controller.change
)

module.exports = router;