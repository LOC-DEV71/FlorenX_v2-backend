const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/inventory.controller");
// const validate = require("../../Validate/Admin/products.valiable");
// const middleware = require("../../Middleware/Admin/permission.middleware");

router.post("/import", controller.inventoryImport);


module.exports = router;