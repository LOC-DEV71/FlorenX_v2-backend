const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/inventory.audit.controller");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.post(
    "/", 
    middleware.permissionMiddleWare("inventory_audit"),
    controller.createInventoryAudit
);
router.get("/get-list", middleware.permissionMiddleWare("inventory_audit"), controller.getList);
router.get("/detail/:code", middleware.permissionMiddleWare("inventory_audit"), controller.getDetail);

module.exports = router;