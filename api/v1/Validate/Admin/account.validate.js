const isEmail = require("../../../../helper/isEmail.helper");
const isStrongPassword = require("../../../../helper/isStrongPassword.helper");
module.exports.accountValidate = async (req, res, next) => {
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

        if (!isEmail(req.body.email)) {
            return res.status(400).json({
                message: "Email không đúng định dạng",
                code: false
            });
        }

        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu",
                code: false
            })
        }
        if (!isStrongPassword(req.body.password)) {
            return res.status(400).json({
                message: "Password phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt",
                code: false
            });
            }
        if(!req.body.role_slug){
            return res.status(400).json({
                message: "Vui lòng chọn quyền",
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
module.exports.updateAccountValidate = async (req, res, next) => {
    try {
        console.log(req.body)
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

        if (!isEmail(req.body.email)) {
            return res.status(400).json({
                message: "Email không đúng định dạng",
                code: false
            });
        }
        if (req.body.password && !isStrongPassword(req.body.password)) {
            return res.status(400).json({
                message: "Password phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt",
                code: false
            });
            }
        if(!req.body.role_slug){
            return res.status(400).json({
                message: "Vui lòng chọn quyền",
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