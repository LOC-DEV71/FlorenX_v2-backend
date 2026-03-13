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

module.exports.updateProductCategoryValidate = async (req, res, next) => {
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

        const { _id, slug } = req.body;

        const existCategory = await ProductCategories.findOne({
            slug: slug,
            _id: { $ne: _id }
        });

        if (existCategory) {
            return res.status(400).json({
                code: false,
                message: "Slug bị trùng"
            });
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

        const childCount = await ProductCategories.countDocuments({ parent_id: _id });

        if (childCount > 0) {
            const currentCategory = await ProductCategories.findById(_id);
            const oldParentId = currentCategory.parent_id ? currentCategory.parent_id.toString() : "";
            const newParentId = req.body.parent_id ? req.body.parent_id.toString() : "";

            if (oldParentId !== newParentId) {
                return res.status(400).json({
                    message: "Danh mục còn chứa danh mục con, không được thay đổi",
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
