const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/orders.controller");
// const validate = require("../../Validate/Admin/news.validate");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.get(
  "/get-list",
  middleware.permissionMiddleWare("view_orders"),
  controller.index
);
router.patch(
  "/update-status",
  middleware.permissionMiddleWare("update_orders"),
  controller.updateStatus
);


module.exports = router;