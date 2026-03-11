const ProductCategories = require("../../Models/products.category");
const bulidTree = require("../../../../helper/buildTree.helper");
module.exports.getBulidTree = async (req, res) => {
    try {
        const productCategories = await ProductCategories.find({
            deleted: false
        }).sort({position: 1})
        const categories = bulidTree.buildTree(productCategories, "");
        console.log(categories)
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