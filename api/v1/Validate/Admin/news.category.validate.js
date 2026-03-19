const slugHelper = require("../../../../helper/slug.helper");
const NewsCategory = require("../../Models/news.category.model");
module.exports.newsCategoryValidate = async (req, res, next) => {
    try {
        console.log(req.body)
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên danh mục bài viết",
                code: false
            })
        }

        if(req.body.title && !req.body.slug){
            req.body.slug = slugHelper(req.body.title)
        }

        const exitSlug = await NewsCategory.findOne({
            slug: req.body.slug,
        })

        if(exitSlug){
            return res.status(400).json({
                message: "Slug hoặc tên danh đã bị trùng",
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
module.exports.updateNewsCategoryValidate = async (req, res, next) => {
    try {
        console.log(req.body)
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên danh mục bài viết",
                code: false
            })
        }

        if(req.body.title && !req.body.slug){
            req.body.slug = slugHelper(req.body.title)
        }

        const exitSlug = await NewsCategory.findOne({   
            slug: req.body.slug,
        })

        if(exitSlug._id.toString() !== req.body.id){
            return res.status(400).json({
                message: "Slug hoặc tên danh đã bị trùng",
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
