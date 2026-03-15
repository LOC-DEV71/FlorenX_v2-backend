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
router.get("/:id", controller.getAccountById);
router.post("/change-multi", controller.changeMulti);
router.post(
    "/create", 
    // middleware.permissionMiddleWare("create_accounts"),
    upload.fields([
    {name: "avatar", maxCount: 1 }
    ]),
    cloudinary.streamUpload,
    validate.accountValidate,
    controller.create
);
router.post(
    "/update/:id", 
    // middleware.permissionMiddleWare("create_accounts"),
    
    upload.fields([
        {name: "avatar", maxCount: 1 }
    ]),
    cloudinary.streamUploadAvatar,
    validate.updateAccountValidate, 
    controller.update
);

module.exports = router;