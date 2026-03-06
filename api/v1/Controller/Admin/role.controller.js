const Role = require("../../Models/roles.model");
const slugHelper = require("../../../../helper/slug.helper");
module.exports.index = async (req, res) => {
    
}

module.exports.create = async (req, res) => {
    try {
        if(req.body.title){
            req.body.slug = slugHelper(req.body.title)
        } 
        
        const createRole = new Role(req.body)
        await createRole.save();

        return res.status(200).json({
            message: "Tạo tài khoản mới thành công"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}