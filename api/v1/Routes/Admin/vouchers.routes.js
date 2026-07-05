const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/vouchers.controller");
const middleware = require("../../Middleware/Admin/permission.middleware")

router.get("/", middleware.permissionMiddleWare("view_vouchers"), controller.index);
router.get("/detail/:id", middleware.permissionMiddleWare("view_vouchers"), controller.detail);
router.post("/create", middleware.permissionMiddleWare("create_vouchers"), controller.create);
router.patch("/edit/:id", middleware.permissionMiddleWare("update_vouchers"), controller.edit);
router.delete("/delete/:id", middleware.permissionMiddleWare("delete_vouchers"), controller.delete);

module.exports = router;