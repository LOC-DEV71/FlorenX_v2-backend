const Account = require("../../Models/accounts.model");
const Roles = require("../../Models/roles.model");
const bcrypt = require("bcryptjs");
const jwtUtils = require("../../../../utils/jwt.utils");

module.exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const exitEmail = await Account.findOne({
            email,
            deleted: false
        }).lean();
        if(!exitEmail){
            return res.status(400).json({
                message: "Email không tồn tại",
                code: false
            })
        }
        const isMatch = await bcrypt.compare(password, exitEmail.password);

        if(!isMatch){
            return res.status(400).json({
                message: "Mật khẩu không chính xác",
                code: false
            })
        }

        const token = jwtUtils.createToken({
            id: exitEmail._id,
            role: exitEmail.role_slug
        })

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        
            sameSite: "none",    
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Đặng nhập thành công",
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
module.exports.logout = async (req, res) => {
    try {
        

        return res.status(200).json({
            message: "Đã đăng xuất"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getAdmin = async (req, res) => {
    try {
        const token = req.cookies.token;
        const dedcode = jwtUtils.verifyToken(token);
        
        const admin = await Account.findOne({
            _id: dedcode.id,
            deleted: false
        }).select("-password -_id")

        const role = await Roles.findOne({
            slug: admin?.role_slug
        })
        
        return res.status(200).json({
            message: "Lấy thành công",
            admin,
            role,
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}