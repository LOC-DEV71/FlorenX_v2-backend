const ProductCategories = require("../../Models/products.category");
const bulidTree = require("../../../../helper/buildTree.helper");
const getChildrenCategories = require("../../../../helper/getAllProductInCategoryParentId");

module.exports.getBulidTree = async (req, res) => {
    try {
        const productCategories = await ProductCategories.find({
            deleted: false
        }).sort({position: 1})
        const categories = bulidTree.buildTree(productCategories, "");
        return res.status(200).json({
            code: true,
            categories
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getByslug = async (req, res) => {
    try {
        const { slug } = req.params;

        const category = await ProductCategories.findOne({
            deleted: false,
            slug: slug
        });

        if (!category) {
            return res.status(404).json({
                code: false,
                message: "Không tìm thấy danh mục"
            });
        }

        const categoryId = category._id.toString();
        const childIds = await getChildrenCategories.getChildrenCategories(categoryId);

        const ids = [categoryId, ...childIds];

        const categories = await ProductCategories.find({
            deleted: false,
            _id: { $in: ids }
        }).limit(5)

        return res.status(200).json({
            code: true,
            categories
        });
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        });
    }
};