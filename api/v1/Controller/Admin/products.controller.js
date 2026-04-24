const Product = require("../../Models/products.models");
const paginationHelper = require("../../../../helper/pagination.helper");
const slugHelper = require("../../../../helper/slug.helper");
const getAllProductsHelper = require("../../../../helper/getAllProductInCategoryParentId");
const ProductStock = require("../../Models/product-stock.models");
const mongoose = require("mongoose");
// [GET] /api/v1/admin/products
module.exports.index = async (req, res) => {
    try {
        const find = {
            deleted: false
        };

        const sort = {};

        if (req.query.sortByCategory) {
            const childrenCategoryIds = await getAllProductsHelper.getChildrenCategories(req.query.sortByCategory);

            find.product_category_id = {
                $in: [
                    new mongoose.Types.ObjectId(req.query.sortByCategory),
                    ...childrenCategoryIds.map(id => new mongoose.Types.ObjectId(id))
                ]
            };
        }

        if (req.query.sort) {
            const [key, value] = req.query.sort.split("-");

            // filter featured
            if (key === "featured") {
                find.featured = value;
            }

            // sort
            if (key === "position") {
                sort.position = value === "asc" ? 1 : -1;
            }

            if (key === "price") {
                sort.price = value === "asc" ? 1 : -1;
                sort.position = 1;
            }

            if (key === "title") {
                sort.title = value === "asc" ? 1 : -1;
                sort.position = 1;
            }
        }

        if (Object.keys(sort).length === 0) {
            sort.position = -1;
        }

        const countProducts = await Product.countDocuments({ deleted: false });

        const pagination = paginationHelper.pagination(countProducts, req.query, {});

        const countProductsActive = await Product.countDocuments({
            status: "active",
            deleted: false
        });

        const countOutStock = await Product.countDocuments({
            stock: 0,
            deleted: false
        });

        const countLowStock = await Product.countDocuments({
            stock: { $lte: 10 },
            deleted: false
        });

        const products = await Product.aggregate([
            {
                $match: {
                    ...find
                }
            },
            { $sort: sort },
            { $skip: pagination.skip },
            { $limit: pagination.limit },

            {
                $lookup: {
                    from: "stocks",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "stocks"
                }
            },

            {
                $addFields: {
                    stock: { $sum: "$stocks.quantity" }
                }
            },

            {
                $project: {
                    stocks: 0
                }
            }
        ]);



        return res.status(200).json({
            code: true,
            products,
            pagination,
            totalProduct: countProducts,
            productsActive: countProductsActive,
            countOutStock,
            countLowStock
        });
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error.message}`
        });
    }
};


// [GET] /api/v1/admin/products/get-list
module.exports.getListProducts = async (req, res) => {
    try {
        const find = { deleted: false };
        const sort = { position: -1 };
        const { selectedWarehouse } = req.query;

        let warehouseObjectId = null;

        if (selectedWarehouse) {
            if (!mongoose.Types.ObjectId.isValid(selectedWarehouse)) {
                return res.status(400).json({
                    code: false,
                    message: "selectedWarehouse không hợp lệ"
                });
            }

            warehouseObjectId = new mongoose.Types.ObjectId(selectedWarehouse);
        }

        const countProducts = await Product.countDocuments(find);
        const pagination = paginationHelper.pagination(countProducts, req.query, {});

        const products = await Product.aggregate([
            { $match: find },
            { $sort: sort },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            {
                $lookup: {
                    from: "stocks",
                    let: {
                        productId: "$_id",
                        warehouseId: warehouseObjectId
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$product_id", "$$productId"] },
                                        ...(warehouseObjectId
                                            ? [{ $eq: ["$warehouse_id", "$$warehouseId"] }]
                                            : [])
                                    ]
                                }
                            }
                        }
                    ],
                    as: "stocks"
                }
            },
            {
                $addFields: {
                    stock: { $ifNull: [{ $sum: "$stocks.quantity" }, 0] }
                }
            },
            {
                $project: {
                    stocks: 0
                }
            }
        ]);


        return res.status(200).json({
            code: true,
            products,
            pagination
        });
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error.message}`
        });
    }
};
// [GET] /api/v1/admin/products/get-list-no-quert
module.exports.getListProductNoQuery = async (req, res) => {
    try {
        const find = { deleted: false };
        const sort = { position: -1 };

       const products = await Product.aggregate([
            {
                $match: {
                    ...find
                }
            },
            { $sort: sort },

            {
                $lookup: {
                    from: "stocks",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "stocks"
                }
            },

            {
                $addFields: {
                    stock: { $sum: "$stocks.quantity" }
                }
            },

            {
                $project: {
                    stocks: 0
                }
            }
        ]);
        return res.status(200).json({
            code: true,
            products
        });
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error.message}`
        });
    }
};

module.exports.getListExport = async (req, res) => {
    try {
        const find = { deleted: false };
        const sort = { position: -1 };

        const warehouseId = req.query.warehouse_id
            ? new mongoose.Types.ObjectId(req.query.warehouse_id)
            : null;

        const products = await Product.aggregate([
            {
                $match: {
                    ...find
                }
            },
            { $sort: sort },

            {
                $lookup: {
                    from: "stocks",
                    let: {
                        productId: "$_id",
                        warehouseId: warehouseId
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$product_id", "$$productId"] },
                                        ...(warehouseId
                                            ? [{ $eq: ["$warehouse_id", "$$warehouseId"] }]
                                            : [])
                                    ]
                                }
                            }
                        }
                    ],
                    as: "stocks"
                }
            },

            {
                $addFields: {
                    stock: { $sum: "$stocks.quantity" }
                }
            },

            {
                $project: {
                    stocks: 0
                }
            }
        ]);

        return res.status(200).json({
            code: true,
            products
        });
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error.message}`
        });
    }
};

// [POST] /api/v1/admin/products/create
module.exports.create = async (req, res) => {
    try {
        if (req.body.title) {
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
            const countDocuments = await Product.countDocuments({ deleted: false });
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
                    { deleted: true }
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

// [GET] /api/v1/admin/products/:slug
module.exports.getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = await Product.findOne({
            slug: slug,
            deleted: false
        })

        return res.status(200).json({
            message: "Lấy thành công",
            code: true,
            data
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
// [POST] /api/v1/admin/products/update/:slug
module.exports.update = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body;

        const exitProduct = await Product.findOne({ slug: slug, deleted: false })

        if (!exitProduct) {
            req.body.title = slugHelper(req.body.title)
        }


        if (req.body.specs) {
            req.body.specs = JSON.parse(req.body.specs);
        }

        if (req.body.product_category_id) {
            req.body.product_category_id = req.body.product_category_id.toString();
        }

        await Product.updateOne(
            { slug: slug },
            req.body
        )
        return res.status(200).json({
            message: "Cập nhật thành công",
            code: true,
            data
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
