const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/product.preview.controller");
// const validate = require("../../Validate/Admin/product.category.validate");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.get("/get-list/:slug", middleware.permissionMiddleWare("view_products"), controller.getList)
router.post("/return-review", middleware.permissionMiddleWare("update_products"), controller.serverReturnReview)

module.exports = router;