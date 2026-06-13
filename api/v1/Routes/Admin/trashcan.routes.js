const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/trashcan.controller");
// const roleValidate = require("../../Validate/Admin/role.validate");
const middleware = require("../../Middleware/admin/permission.middleware");

router.get("/", middleware.permissionMiddleWare("trash_management"), controller.index);

router.patch("/restore/:type/:id", middleware.permissionMiddleWare("trash_management"), controller.restoreItem);
router.patch("/restore-all", middleware.permissionMiddleWare("trash_management"), controller.restoreAll);

router.delete("/delete/:type/:id", middleware.permissionMiddleWare("trash_management"), controller.deleteItem);
router.delete("/delete-selected", middleware.permissionMiddleWare("trash_management"), controller.deleteSelected);
router.delete("/delete-all", middleware.permissionMiddleWare("trash_management"), controller.deleteAll);


module.exports = router;