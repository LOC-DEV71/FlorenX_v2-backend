const Product = require("../../Models/products.models");
const Category = require("../../Models/products.category");
const getChildrenCategories = require("../../../../helper/getAllProductInCategoryParentId");

module.exports.getProductByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        
        const productCategory = await Category.findOne({
            slug: category,
            deleted: false
        }).select("_id").lean();


        if (!productCategory) {
            return res.status(404).json({
                code: false,
                message: "Không tìm thấy danh mục"
            });
        }

        const product_category_id = productCategory._id.toString();
        const childIds = await getChildrenCategories.getChildrenCategories(product_category_id)
        const categortIds = [product_category_id, ...childIds];

        const find = {
            deleted: false,
            product_category_id: {$in: categortIds}
        }

        switch (req.query.price) {
            case "5000000":
                find.price = { $lt: 5000000 };
                break;
            case "50000000":
                find.price = { $lt: 50000000 };
                break;
            case "500000000":
                find.price = { $lt: 500000000 };
                break;
            case "15000000":
                find.price = { $lt: 15000000 };
                break;
        
            default:
                break;
        }

        if (req.query.discount === "true") {
            find.discountPercentage = { $gt: 0, $type: "number" };
        }

        const products = (await Product.find(find));

        
        return res.status(200).json({
            code: true,
            products,
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
};