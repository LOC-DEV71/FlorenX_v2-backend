const Product = require("../../Models/products.models");
const paginationHelper = require("../../../../helper/pagination.helper");
const slugHelper = require("../../../../helper/slug.helper");
// [GET] /api/v1/admin/products
module.exports.index = async (req, res) => {
    try {

        // sort && pagination
        const sort = {}
        const find = {
            deleted: false
        }
        if (req.query.sort === "featured-yes") {
            const [key, value] = req.query.sort.split("-");
            find.featured = value
        }

        if (req.query.sort === "featured-no") {
            const [key, value] = req.query.sort.split("-");
            find.featured = value
        }

        if (req.query.sort) {
            const [key, value] = req.query.sort.split("-");
            sort[key] = value === "asc" ? 1 : -1;
        }

        //count products
        const countProducts = await Product.find({deleted: false}).countDocuments();
        const pagination = paginationHelper.pagination(countProducts, req.query, {});


        //count products active
        const countProductsActive = await Product.find({status: "active", deleted: false}).countDocuments();

        //count out of stock
        const countOutStock = await Product.find({stock: 0, deleted: false}).countDocuments();

        //count out of stock
        const countLowStock = await Product.find({stock: { $lte: 10 }, deleted: false}).countDocuments();

        const products = await Product
            .find(find)
            .sort(sort)
            .skip(pagination.skip)
            .limit(pagination.limit);


        return res.status(200).json({
            products,
            pagination,
            totalProduct: countProducts,
            productsActive: countProductsActive,
            countOutStock,
            countLowStock
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
        
        if(req.body.title){
            req.body.slug = slugHelper(req.body.title)
        }

        if (req.body.specs) {
            req.body.specs = JSON.parse(req.body.specs);
        }

        if (req.body.discountPercentage) {
            req.body.discountPercentage = Number(req.body.discountPercentage);
        }


        if (req.body.position) {
            req.body.position = Number(req.body.position);
        } else {
            const countDocuments = await Product.countDocuments();
            req.body.position = countDocuments + 1;
        }

        const createProduct = new Product(req.body);
        await createProduct.save();

        return res.status(200).json({
            message: "Thêm sản phẩm thành công",
            code: true,
            slug: createProduct.slug
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

// [POST] /api/v1/admin/products/change-multi
module.exports.changeMulti = async (req, res) => {
    try {
        const { selectId, typeChange } = req.body;
        switch (typeChange) {
            case "active":
                await Product.updateMany(
                    { _id: { $in: selectId } },
                    { status: "active" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "inactive":
                await Product.updateMany(
                    { _id: { $in: selectId } },
                    { status: "inactive" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "position":

                const { positions } = req.body;
                for (const item of positions) {
                    await Product.updateOne(
                        { _id: item.id },
                        { position: item.position }
                    );
                }
                return res.status(200).json({
                    message: "Cập nhật vị trí thành công",
                    code: true
                });
            case "delete":
                await Product.updateMany(
                    { _id: { $in: selectId } },
                    {deleted: true}
                )
                return res.status(200).json({
                    message: "Đã xóa sản phẩm thành công",
                    code: true
                })
            default:
                return;
        }
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
