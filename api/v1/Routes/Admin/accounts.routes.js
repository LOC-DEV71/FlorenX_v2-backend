const express = require("express");
const router = express.Router();

const controller = require("../../Controller/Admin/accounts.controller");
const validate = require("../../Validate/Admin/account.validate")

router.get("/", controller.index);
router.post(
    "/create", 
    validate.accountValiable,
    controller.create
);

module.exports = router;