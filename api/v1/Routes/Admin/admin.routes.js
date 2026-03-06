const express = require("express");
const router = express.Router();

const productRoutes = require("./products.routes");  
const rolesRoutes = require("./roles.routes");


router.use("/products", productRoutes);
router.use("/roles", rolesRoutes);

module.exports = router;