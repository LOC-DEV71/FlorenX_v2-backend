const express = require("express");
const router = express.Router();

const productRoutes = require("./products.routes");  
const rolesRoutes = require("./roles.routes");
const accountsRoutes = require("./accounts.routes");


router.use("/products", productRoutes);
router.use("/roles", rolesRoutes);
router.use("/accounts", accountsRoutes);

module.exports = router;