const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/products.controller");
const validate = require("../../Validate/Admin/products.valiable");
const middleware = require("../../Middleware/Admin/permission.middleware");

const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        fieldSize: 10 * 1024 * 1024
    }
})

const cloudinary = require("../../../../service/cloudinary.service");

router.get(
    "/", 
    middleware.permissionMiddleWare("view_products"),
    controller.index
);
router.get(
    "/get-list", 
    middleware.permissionMiddleWare("view_products"),
    controller.getListProducts
);
router.get(
    "/get-list-no-query", 
    middleware.permissionMiddleWare("view_products"),
    controller.getListProductNoQuery
);
router.get(
    "/:slug", 
    middleware.permissionMiddleWare("view_products"),
    controller.getProductBySlug
);

router.post(
    "/change-multi", 
    middleware.permissionMiddleWare("update_products"),
    controller.changeMulti
);

router.post(
    "/create",
    middleware.permissionMiddleWare("create_products"),
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
    middleware.permissionMiddleWare("update_products"),
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 10 }
    ]),
    validate.productValidate,
    cloudinary.streamUpload,
    controller.update
);

module.exports = router;