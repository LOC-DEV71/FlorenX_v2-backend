const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/news.category.controller");
const validate = require("../../Validate/Admin/news.category.validate");
const middleware = require("../../Middleware/Admin/permission.middleware")


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
    middleware.permissionMiddleWare("view_news_category"),
    controller.index
)
router.get(
    "/get-list", 
    middleware.permissionMiddleWare("view_news_category"),
    controller.getList
)

router.get(
    "/:slug", 
    middleware.permissionMiddleWare("view_news_category"),
    controller.getBySlug
)
router.post("/change-multi", controller.changeMulti);
router.post(
    "/create", 
    middleware.permissionMiddleWare("create_news_category"),
    upload.fields([
        { name: "thumbnail", maxCount: 1 }
    ]),
    validate.newsCategoryValidate, 
    cloudinary.streamUpload,
    controller.create
)
router.post(
    "/update", 
    middleware.permissionMiddleWare("update_news_category"),
    upload.fields([
        { name: "thumbnail", maxCount: 1 }
    ]),
    validate.updateNewsCategoryValidate, 
    cloudinary.streamUpload,
    controller.update
)



module.exports = router;