const Role = require("../../Models/roles.model");
const slugHelper = require("../../../../helper/slug.helper");
module.exports.roleValidate = async (req, res, next) => {
    try {
        if(!req.body.slug && req.body.title){
            req.body.slug = slugHelper(req.body.title)
        } 

        const role = await Role.findOne({
            slug: req.body.slug
        })
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên quyền",
                code: false
            })
        }
        if(role){
            return res.status(400).json({
                message: "Không được trùng tên quyền đã có",
                code: false
            })
        }
        
        next();
        
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.updateRoleValidate = async (req, res, next) => {
    try {
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên quyền.",
                code: false
            })
        }
        
        const exitTitle = await Role.findOne({
            _id: req.body.id,
            title: req.body.title
        })

        if(!exitTitle){
            return res.status(400).json({
                message: "Tên quyền đã tồn tại.",
                code: false
            })
        }

        const exitSlug = await Role.findOne({
            _id: req.body.id,
            slug: req.body.slug
        })

        if(!exitSlug){
            return res.status(400).json({
                message: "Slug đã tồn tại.",
                code: false
            })
        }
             
        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}