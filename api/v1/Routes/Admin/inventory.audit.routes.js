const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/inventory.audit.controller");

router.post("/", controller.createInventoryAudit);
router.get("/get-list", controller.getList);
router.get("/detail/:code", controller.getDetail);

module.exports = router;