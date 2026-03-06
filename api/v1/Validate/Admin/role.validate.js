const Role = require("../../Models/roles.model");
module.exports.roleValidate = async (req, res, next) => {
    try {
        const role = await Role.findOne({
            title: req.body.title
        })
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên quyền"
            })
        }
        if(role){
            return res.status(400).json({
                message: "Không được trùng tên quyền đã có"
            })
        }
        
        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}