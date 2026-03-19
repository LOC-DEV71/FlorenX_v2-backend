const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/product.categories.controller");
const validate = require("../../Validate/Admin/product.category.validate");
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
    middleware.permissionMiddleWare("view_product_category"),
    controller.index
);
router.get(
    "/detail/:slug", 
    middleware.permissionMiddleWare("view_product_category"),
    controller.getCategoryBySlug
);

router.get(
    "/get-list", 
    middleware.permissionMiddleWare("view_product_category"),
    controller.getListCategory
);

router.get(
    "/tree-categories", 
    middleware.permissionMiddleWare("view_product_category"),
    controller.getBulidTree
);


router.post(
    "/change-multi", 
    middleware.permissionMiddleWare("update_product_category"),
    controller.changeMulti
);

router.post(
    "/create", 
    middleware.permissionMiddleWare("create_product_category"),
    upload.fields([
    {name: "thumbnail", maxCount: 1 }
    ]), 
    validate.productCategoryValidate,
    cloudinary.streamUpload,
    controller.create
);

router.post(
    "/update", 
    middleware.permissionMiddleWare("update_product_category"),
    upload.fields([
    {name: "thumbnail", maxCount: 1 }
    ]), 
    validate.updateProductCategoryValidate,
    cloudinary.streamUpload,
    controller.update
);

module.exports = router;