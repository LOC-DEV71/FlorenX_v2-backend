const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/product.categories.controller");

router.get("/tree-categories", controller.getBulidTree);

module.exports = router;