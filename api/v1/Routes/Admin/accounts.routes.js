const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/accounts.controller");
const validate = require("../../Validate/Admin/account.validate")
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

router.get("/", controller.index);

router.post(
    "/create", 
    validate.accountValidate,
    middleware.permissionMiddleWare("create_accounts"),
    upload.fields([
    {name: "avatar", maxCount: 1 }
    ]),
    cloudinary.streamUpload,
    controller.create
);

module.exports = router;