const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/products.controller");
const validate = require("../../Validate/Admin/products.valiable")

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
router.get("/:slug", controller.getProductBySlug);
router.post("/change-multi", controller.changeMulti);
router.post(
    "/create",
    
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 10 }
    ]),
    validate.productValidate,
    cloudinary.streamUpload,
    controller.create
);

router.post(
    "/update/:slug",
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 10 }
    ]),
    validate.productValidate,
    cloudinary.streamUpload,
    controller.update
);

module.exports = router;