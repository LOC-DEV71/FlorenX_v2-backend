const express = require("express");
const router = express.Router();

const productRoutes = require("./products.routes");  

router.use("/products", productRoutes);
router.use("/roles", productRoutes);

module.exports = router;