const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/users.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.get(
    "/",
    middleware.permissionMiddleWare("view_users"),
    controller.index
);

router.get(
    "/:id",
    middleware.permissionMiddleWare("view_users"),
    controller.detail
);

router.post(
    "/change-multi",
    middleware.permissionMiddleWare("update_users"),
    controller.changeMulti
);

router.patch(
    "/update/:id",
    middleware.permissionMiddleWare("update_users"),
    controller.update
);

module.exports = router;