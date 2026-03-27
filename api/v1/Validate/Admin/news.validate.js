const slugHelper = require("../../../../helper/slug.helper");
const News = require("../../Models/news.model");
module.exports.newsValidate = async (req, res, next) => {
    try {
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên bài viết",
                code: false
            })
        }

        if(req.body.title && !req.body.slug){
            req.body.slug = slugHelper(req.body.title)
        }

        if(!req.body.content){
            return res.status(400).json({
                message: "Vui lòng nhập nội dung bài viết",
                code: false
            })
        }

        if(!req.body.slug_category){
            return res.status(400).json({
                message: "Vui lòng chọn danh mục bài viết",
                code: false
            })
        }

        const exitSlug = await News.findOne({
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
