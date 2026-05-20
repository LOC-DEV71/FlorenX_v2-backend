const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/notifications.controller");
// const validate = require("../../Validate/Admin/news.validate");
// const middleware = require("../../Middleware/Admin/permission.middleware");

router.get("/get-list", controller.getList)
router.post("/read/:id", controller.readNotification)

module.exports = router;