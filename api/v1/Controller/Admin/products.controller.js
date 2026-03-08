const Product = require("../../Models/products.models");
const paginationHelper = require("../../../../helper/pagination.helper");
// [GET] /api/v1/admin/products
module.exports.index = async (req, res) => {
    try {
        const countProducts = await Product.countDocuments();
        const pagination = paginationHelper.pagination(countProducts, req.query, {});

        const products = await Product
            .find()
            .sort({createAt: -1})
            .limit(pagination.limit)
            .skip(pagination.skip)

            
        return res.status(200).json({
            message: "OK",
            products,
            pagination
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}

// [POST] /api/v1/admin/products/create
module.exports.create = async (req, res) => {
    try {
        if (req.body.specs) {
            req.body.specs = JSON.parse(req.body.specs);
        }

        if (req.body.discountPercentage) {
            req.body.discountPercentage = Number(req.body.discountPercentage);
        }


        if (req.body.position) {
            req.body.position = Number(req.body.position);
        }

        console.log(req.body)

        const createProduct = new Product(req.body);
        await createProduct.save();

        return res.status(200).json({
            message: "Thêm sản phẩm thành công"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}