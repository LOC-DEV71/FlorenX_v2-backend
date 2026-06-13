const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Admin/dashboard.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.get(
    "/overview", 
    middleware.permissionMiddleWare("view_dashboard"),
    controller.overview
);

module.exports = router;
