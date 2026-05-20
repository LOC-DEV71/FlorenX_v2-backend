const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/product.preview.controller");

router.post("/comment", controller.commentProduct);
router.get("/get-list", controller.getList);
router.get("/get-order-preview", controller.getProductPreview);

module.exports = router;