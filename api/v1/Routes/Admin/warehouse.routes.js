const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/warehouse.controller");
// const validate = require("../../Validate/Admin/products.valiable");
// const middleware = require("../../Middleware/Admin/permission.middleware");

router.get("/get-list", controller.getList);


module.exports = router;