const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/products.controller");
const validate = require("../../Validate/Admin/products.valiable")

router.get("/", controller.index);
router.post(
    "/create", 
    validate.productValiable,
    controller.create
);

module.exports = router;