const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/news.controller");

router.get("/category/:slug", controller.getBySlug);

module.exports = router;