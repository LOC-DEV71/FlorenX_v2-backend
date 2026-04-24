const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/inventory.controller");
// const validate = require("../../Validate/Admin/products.valiable");
const middleware = require("../../Middleware/Admin/permission.middleware");

router.post("/import/create", middleware.permissionMiddleWare("import_warehouse"), controller.inventoryImport);
router.post("/export/create", middleware.permissionMiddleWare("export_warehouse"), controller.inventoryExport);
router.get("/export/get-list", middleware.permissionMiddleWare("export_warehouse"), controller.getListInventoryExport);
router.get("/import/get-list", middleware.permissionMiddleWare("import_warehouse"), controller.getListInventoryImport);


module.exports = router;