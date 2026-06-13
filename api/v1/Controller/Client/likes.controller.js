const Likes = require("../../Models/likes.model");
const Users = require("../../Models/user.models");
const Products = require("../../Models/products.models");
const jwtUtils = require("../../../../utils/jwt.utils")
const mongoose = require("mongoose");

module.exports.addLike = async (req, res) => {
    try {
        const {productId, type} = req.body;
        const token_client = req.cookies.token_client;
        let user = null;
        if(token_client){
            const dedcode = await jwtUtils.verifyToken(token_client);
            user = await Users.findOne({_id: dedcode.id})
        }
        switch (type) {
            case "add":
                const addLike = await Likes({
                    clientId: user._id.toString(),
                    productId: productId,
                })
                addLike.save();
                return res.status(200).json({
                    message: `Đã thêm vào danh sách yêu thích`,
                    code: true
                });
            case "clear":
                await Likes.deleteOne({productId: productId, clientId: user._id.toString()})
                return res.status(200).json({
                    message: `Đã xóa khỏi danh sách yêu thích`,
                    code: true
                });
        
            default:
                break;
        }
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getLike = async (req, res) => {
    try {
        const token_client = req.cookies.token_client;
        let user = null;
        if(token_client){
            const dedcode = await jwtUtils.verifyToken(token_client);
            user = await Users.findOne({_id: dedcode.id})
        }

        const like = await Likes.find({
            clientId: user._id.toString()
        }).lean().select("productId")
        
        const likes = like.map(item => item.productId)
                
        return res.status(200).json({
            code: true,
            likes
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getListLikeProducts = async (req, res) => {
    try {
        const token_client = req.cookies.token_client;

        if (!token_client) {
            return res.status(401).json({ code: false, message: "Chưa đăng nhập" });
        }

        const decoded = await jwtUtils.verifyToken(token_client);
        const user = await Users.findOne({ _id: decoded.id }).lean().select("_id");

        if (!user) {
            return res.status(401).json({ code: false, message: "Người dùng không tồn tại" });
        }

        const likedDocs = await Likes.find({ clientId: user._id.toString() })
            .lean()
            .select("productId");

        const likedIds = likedDocs.map(item => new mongoose.Types.ObjectId(item.productId));

        if (likedIds.length === 0) {
            return res.status(200).json({ code: true, products: [] });
        }

        const products = await Products.aggregate([
            {
                $match: {
                    deleted: false,
                    _id: { $in: likedIds }
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
            { $unset: "reviews" }
        ]);

        return res.status(200).json({ code: true, products });

    } catch (error) {
        return res.status(400).json({ message: `Lỗi: ${error.message}` });
    }
};