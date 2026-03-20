const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/trashcan.controller");
// const roleValidate = require("../../Validate/Admin/role.validate");
// const middleware = require("../../Middleware/Admin/permission.middleware")

router.get("/", controller.index);

router.patch("/restore/:type/:id", controller.restoreItem);
router.patch("/restore-all", controller.restoreAll);

router.delete("/delete/:type/:id", controller.deleteItem);
router.delete("/delete-selected", controller.deleteSelected);
router.delete("/delete-all", controller.deleteAll);


module.exports = router;