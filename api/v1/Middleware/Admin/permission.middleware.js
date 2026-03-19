const Account = require("../../Models/accounts.model");
const Role = require("../../Models/roles.model");
const jwtUtils = require("../../../../utils/jwt.utils");
module.exports.permissionMiddleWare =  (permission) =>{
    return async (req, res, next) => {
        try {
            const token = req.cookies.token;
            if(!token){
                return res.status(401).json({
                    message: "Bạn chưa đăng nhập",
                    code: false
                })
            }
            const {id, role} = jwtUtils.verifyToken(token);
            const exitAccount = await Account.findOne({
                _id: id,
                role_slug: role
            }).lean().select("role_slug");
            if(!exitAccount){
                return res.status(400).json({
                    message: "Tài khoản admin không tồn tại",
                    code: false
                })
            }
            const exitRole = await Role.findOne({
                slug: exitAccount.role_slug
            }).lean()
            
            if(!exitRole){
                return res.status(400).json({
                    message: "Nhóm quyền không tồn tại",
                    code: false
                })
            }

            if(!exitRole?.permissions?.includes(permission)){
                 return res.status(400).json({
                    message: "Bạn không có quyền thực hiện hành động này",
                    code: false
                })
            }

            next();
        } catch (error) {
            console.error(error)
        }
    }
}