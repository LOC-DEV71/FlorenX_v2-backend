const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Client/likes.controller");

router.post("/add-like", controller.addLike)
router.get("/get-like", controller.getLike)
router.get("/get-like-products", controller.getListLikeProducts)


module.exports = router;