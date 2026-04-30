const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/vouchers.controller");
// const roleValidate = require("../../Validate/Admin/role.validate");
// const middleware = require("../../Middleware/Admin/permission.middleware")

router.get("/", controller.index);



module.exports = router;