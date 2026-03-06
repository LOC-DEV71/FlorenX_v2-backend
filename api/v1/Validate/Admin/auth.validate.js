const isEamil = require("../../../../helper/isEmail.helper");
module.exports.authValidate = async (req, res, next) => {
    try {
        if(!req.body.email){
            return res.status(400).json({
                message: "Vui lòng nhập email"
            })
        }
        if(!isEamil(req.body.email)){
            return res.status(400).json({
                message: "Email không đúng định dạng"
            })
        }
        if(!req.body.password){
            return res.status(400).json({
                message: "Vui lòng nhập mật khẩu"
            })
        }
        next();
    } catch (error) {
        console.error(error)
    }
}