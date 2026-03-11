const slugHelper = require("../../../../helper/slug.helper");
const ProductCategories = require("../../Models/products.category")
module.exports.productCategoryValidate = async (req, res, next) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({
                message: "Vui lòng nhập tên danh mục",
                code: false
            })
        }

        if (!req.body.slug) {
            req.body.slug = slugHelper(req.body.title);
        }

        const existCategory = await ProductCategories.findOne({ slug: req.body.slug });
        if (existCategory) {
            return res.status(400).json({
                message: "Slug bị trùng",
                code: false
            })
        }

        const countCategories = await ProductCategories.countDocuments();


        if (!req.body.position) {
            req.body.position = countCategories + 1;
        } else {
            req.body.position = Number(req.body.position)
            if (Number.isNaN(req.body.position)) {
                return res.status(400).json({
                    message: "Vị trí không hợp lệ",
                    code: false
                });
            }
        }
        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
