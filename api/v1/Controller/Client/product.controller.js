const Product = require("../../Models/products.models");
const Category = require("../../Models/products.category");
const Cart = require("../../Models/cart.model");
const ProductPreview = require("../../Models/products.preview");
const getChildrenCategories = require("../../../../helper/getAllProductInCategoryParentId");
const paginationHelper = require("../../../../helper/pagination.helper");
const searchHelper = require("../../../../helper/search.helper");
const jwt = require("../../../../utils/jwt.utils");
const mongoose = require("mongoose");
// const Likes = require("../../Models/likes.model");
// const Users = require("../../Models/user.models");
// const jwtUtils = require("../../../../utils/jwt.utils")
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


        const product_category_id = productCategory._id;
        const childIds = await getChildrenCategories.getChildrenCategories(product_category_id);
        const categortIds = [product_category_id, ...childIds];

        const find = {
            deleted: false,
            product_category_id: { $in: categortIds },
            status: "active"
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

        const countProducts = await Product.find(find).countDocuments();
        const pagination = paginationHelper.pagination(countProducts, req.query);


       const products = await Product.aggregate([
            { $match: find },
            { $sort: { position: -1 } },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            {
                $lookup: {
                    from: "product_reviews",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "reviews",
                    pipeline: [
                        { $project: { rating: 1, _id: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    totalReviews: { $size: "$reviews" },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$reviews" }, 0] },
                            then: { $avg: "$reviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                // Xóa mảng reviews thô, chỉ giữ totalReviews và averageRating
                $unset: "reviews"
            }
        ]);


        return res.status(200).json({
            code: true,
            products,
            pagination
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
};
module.exports.getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await Product.findOne({
            deleted: false,
            slug: slug,
            status: "active"
        })

        const category = await Category.findOne({
            _id: product.product_category_id
        })
        
        const products = await Product.aggregate([
            {
                $match: {
                    deleted: false,
                    product_category_id: category._id,
                    status: "active",
                    _id: { $ne: product._id }
                }
            },
            {
                $lookup: {
                    from: "product_reviews",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "reviews",
                    pipeline: [
                        { $project: { rating: 1, _id: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    totalReviews: { $size: "$reviews" },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$reviews" }, 0] },
                            then: { $avg: "$reviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                $unset: "reviews"
            }
        ]);
        return res.status(200).json({
            code: true,
            product,
            products
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
};
module.exports.getProductBySale = async (req, res) => {
    try {
        const slug = req.params.category;
        const parentId = await Category.findOne({slug: slug});
        const childIds = await getChildrenCategories.getChildrenCategories(parentId)
       
        const childListId = [parentId._id,...childIds];

        const find = {
            deleted: false,
            product_category_id: { $in: childListId },
            status: "active",
            discountPercentage: { $gt: 0 } 
        }

        const products = await Product.aggregate([
            {$match: find},
            { $sort: { position: -1 } },
            { $limit: 4 },
            {
                $lookup: {
                    from: "product_reviews",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "reviews",
                    pipeline: [
                        { $project: { rating: 1, _id: 0 } }
                    ]
                } 
            },
            {
                $addFields: {
                    totalReviews: { $size: "$reviews" },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$reviews" }, 0] },
                            then: { $avg: "$reviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                // Xóa mảng reviews thô, chỉ giữ totalReviews và averageRating
                $unset: "reviews"
            }
        ])
            
        return res.status(200).json({
            code: true,
            products
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
};

module.exports.getCrossSellProducts = async (req, res) => {
    try {
        const tokenCart = req.cookies.cart;
        if (!tokenCart) {
            return res.status(400).json({ code: false, message: "Không tìm thấy giỏ hàng trong cookie" });
        }

        const decode = await jwt.verifyToken(tokenCart);
        if (!decode || !decode.id) {
            return res.status(400).json({ code: false, message: "Token giỏ hàng không hợp lệ" });
        }

        const cart = await Cart.findOne({_id: decode.id});
        if (!cart) {
            return res.status(400).json({ code: false, message: "Giỏ hàng không tồn tại" });
        }

        const productIds = cart.products?.map((item) => item.product_id) || [];
        if (productIds.length === 0) {
            return res.status(200).json({ code: true, products: [] });
        }
        const product_category = await Product.find({
            _id: { $in: productIds },
            deleted: false,
            status: "active"
        }).select("product_category_id")

        
        const product_category_select_ids = [...new Set(product_category.map((item) => item.product_category_id.toString()))];

        // LẤY RA DANH MỤC CHA CỦA CÁC SẢN PHẨM TRONG GIỎ HÀNG
        const cartCategories = await Category.find({ _id: { $in: product_category_select_ids } });
        const cartParentCategoryIds = cartCategories.map(cat => cat.parent_id ? cat.parent_id.toString() : cat._id.toString());

        const categoryIds = await Category.find({
            status: "active",
            deleted: false,
            parent_id: null
        }).select("_id")
        const categoryIdsString = categoryIds.map(item => item._id.toString());
        
        // BÂY GIỜ LỌC: Các danh mục tổng trừ đi danh mục cha của các sản phẩm trong giỏ
        const categoryFilter = categoryIdsString.filter(item => !cartParentCategoryIds.includes(item));
        const shuffled = categoryFilter.sort(() => 0.5 - Math.random());
        const randomCategory = shuffled.slice(0, 4);    



        const cross_sell_promises = randomCategory.map(async (item) => {
            const childIds = await getChildrenCategories.getChildrenCategories(item);
            const allCategoryIds = [item, ...childIds].map(id => new mongoose.Types.ObjectId(id));

            return await Product.aggregate([
                { 
                    $match: {
                        product_category_id: { $in: allCategoryIds },
                        deleted: false,
                        status: "active"
                    } 
                },
                { $sample: { size: 1 } }, // MongoDB tự động trộn ngẫu nhiên TẤT CẢ kết quả và lấy ra tối đa 1 item
                {
                $lookup: {
                    from: "product_reviews",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "reviews",
                    pipeline: [
                        { $project: { rating: 1, _id: 0 } }
                    ]
                } 
            },
            {
                $addFields: {
                    totalReviews: { $size: "$reviews" },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$reviews" }, 0] },
                            then: { $avg: "$reviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                // Xóa mảng reviews thô và loại bỏ description nặng để API load nhanh hơn
                $unset: ["reviews", "description"]
            }
            ]);
        });


        const cross_sell_results = await Promise.all(cross_sell_promises);

        const cross_sell = cross_sell_results.flat();

        return res.status(200).json({
            code: true,
            products: cross_sell
        });

    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
}

module.exports.searchProducts = async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        
        const find = {
            deleted: false,
            status: "active"
        };

        if (keyword) {
            const regexStr = searchHelper.createDiacriticRegex(keyword);
            const regex = new RegExp(regexStr, "i");
            find.$or = [
                { title: regex },
                { slug: regex },
                { brand: regex }
            ];
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

        const countProducts = await Product.find(find).countDocuments();
        const pagination = paginationHelper.pagination(countProducts, req.query);

        const products = await Product.aggregate([
            { $match: find },
            { $sort: { position: -1 } },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            {
                $lookup: {
                    from: "product_reviews",
                    localField: "_id",
                    foreignField: "product_id",
                    as: "reviews",
                    pipeline: [
                        { $project: { rating: 1, _id: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    totalReviews: { $size: "$reviews" },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$reviews" }, 0] },
                            then: { $avg: "$reviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                $unset: "reviews"
            }
        ]);

        return res.status(200).json({
            code: true,
            products,
            pagination
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false
        });
    }
};
