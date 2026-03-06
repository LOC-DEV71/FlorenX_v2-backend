const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/role.controller");

const multer = require("multer");


router.get("/", controller.index)
router.post(
    "/", 
    controller.create
)

module.exports = router;