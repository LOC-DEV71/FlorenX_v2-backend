const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/product.categories.controller");
const validate = require("../../Validate/Admin/product.category.validate");

const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,  
        fieldSize: 10 * 1024 * 1024 
    }
})

const cloudinary = require("../../../../service/cloudinary.service");

router.get("/", controller.index);
router.get("/tree-categories", controller.getBulidTree);
router.post("/change-multi", controller.changeMulti);

router.post(
    "/create", 
    upload.fields([
    {name: "thumbnail", maxCount: 1 }
    ]), 
    validate.productCategoryValidate,
    cloudinary.streamUpload,
    controller.create
);

module.exports = router;