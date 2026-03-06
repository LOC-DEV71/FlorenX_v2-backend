const isEmail = require("../../../../helper/isEmail.helper");
const isStrongPassword = require("../../../../helper/isStrongPassword.helper");
module.exports.accountValiable = async (req, res, next) => {
    try {
        if(!req.body.fullname){
            return res.status(400).json({
                message: "Vui lòng nhập họ và tên"
            })
        }
        if(!req.body.email){
            return res.status(400).json({
                message: "Vui lòng nhập email"
            })
        }

        if (!isEmail(req.body.email)) {
            return res.status(400).json({
                message: "Email không đúng định dạng"
            });
        }

        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu"
            })
        }
        if (!isStrongPassword(req.body.password)) {
            return res.status(400).json({
                message: "Password phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt"
            });
            }
        if(!req.body.role_slug){
            return res.status(400).json({
                message: "Vui lòng chọn quyền"
            })
        }
        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}