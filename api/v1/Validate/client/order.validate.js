const Users = require("../../Models/user.models");
const IsEmailHelper = require("../../../../helper/isEmail.helper");

module.exports.orderValidate = async (req, res, next) => {
    try {
        if(!req.body.fullname){
            return res.status(400).json({
                message: "Vui lòng nhập họ và tên",
                code: false
            })
        }
        if(!req.body.address){
            return res.status(400).json({
                message: "Vui lòng nhập địa chỉ",
                code: false
            })
        }
        if(!req.body.phone){
            return res.status(400).json({
                message: "Vui lòng nhập số điện thoại",
                code: false
            })
        }
        if(!req.body.pay){
            return res.status(400).json({
                message: "Vui lòng chọn phương thức thanh toán",
                code: false
            })
        }
        if(!req.body.email){
            return res.status(400).json({
                message: "Vui lòng nhập email",
                code: false
            })
        }

        if(!IsEmailHelper(req.body.email)){
            return res.status(400).json({
                message: "Email không đúng định dạng",
                code: false
            })
        }

        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

