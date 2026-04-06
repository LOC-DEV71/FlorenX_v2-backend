const Users = require("../../Models/user.models");
const StrongPasswordHelper = require("../../../../helper/isStrongPassword.helper");
const IsEmailHelper = require("../../../../helper/isEmail.helper");
const bcrypt = require("bcryptjs");

module.exports.authValidate = async (req, res, next) => {
    try {
        if(!req.body.fullname){
            return res.status(400).json({
                message: "Vui lòng nhập họ và tên",
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

        const exitEmail = await Users.findOne({
            email: req.body.email
        })

        if(exitEmail){
            return res.status(400).json({
                message: "Email đã tồn tại",
                code: false
            })
        }

        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu",
                code: false
            })
        }
        if(!StrongPasswordHelper(req.body.password)){
            return res.status(400).json({
                message: "Mật khẩu cần tối thiểu 8 ký tự, trong đó có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt @#...",
                code: false
            })
        }
        if(!req.body.repassword){
            return res.status(400).json({
                message: "Vui lòng xác nhận mật khẩu",
                code: false
            })
        }

        if(req.body.password !== req.body.repassword){
            return res.status(400).json({
                message: "Mật khẩu xác nhận không khớp",
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

module.exports.loginLocal = async (req, res, next) => {
    try {
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


        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu",
                code: false
            })
        }
        if(!StrongPasswordHelper(req.body.password)){
            return res.status(400).json({
                message: "Mật khẩu cần tối thiểu 8 ký tự, trong đó có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt @#...",
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


module.exports.resetPassword = async (req, res, next) => {
    try {
        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu",
                code: false
            })
        }
        if(!StrongPasswordHelper(req.body.password)){
            return res.status(400).json({
                message: "Mật khẩu cần tối thiểu 8 ký tự, trong đó có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt @#...",
                code: false
            })
        }

        if(req.body.password !== req.body.repassword){
            return res.status(400).json({
                message: "Mật khẩu không khớp",
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
