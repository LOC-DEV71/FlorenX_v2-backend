const express = require("express");
const router = express.Router();
const controller = require("../../Controller/Admin/tiers.controller");

router.get("/", controller.index);
router.post("/create", controller.create);
router.patch("/edit/:id", controller.edit);
router.delete("/delete/:id", controller.deleteItem);

module.exports = router;
