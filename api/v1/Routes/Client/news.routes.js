const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/news.controller");

router.get("/categories", controller.getCategories);
router.get("/recent", controller.getRecent);
router.get("/detail/:slug", controller.getDetailBySlug);
router.get("/category/:slug", controller.getByCategorySlug);

module.exports = router;