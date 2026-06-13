const Product = require("../../Models/products.models");
const Account = require("../../Models/accounts.model");
const ProductPreview = require("../../Models/products.preview");
const jwtUtils = require("../../../../utils/jwt.utils");

module.exports.getList = async (req, res) => {
    try {
        const { slug } = req.params;
        const product = await Product.findOne(
            { slug: slug }
        ).select("_id");


        const productPreview = await ProductPreview.find({ product_id: product._id });
        const average = productPreview.length
            ? (productPreview.reduce((sum, p) => sum + p.rating, 0) / productPreview.length).toFixed(1)
            : 0;
        const totalRating = productPreview.length;
        const rating5 = productPreview.filter(item => item.rating === 5).length / totalRating * 100;
        const rating4 = productPreview.filter(item => item.rating === 4).length / totalRating * 100;
        const rating3 = productPreview.filter(item => item.rating === 3).length / totalRating * 100;
        const rating2 = productPreview.filter(item => item.rating === 2).length / totalRating * 100;
        const rating1 = productPreview.filter(item => item.rating === 1).length / totalRating * 100;

        return res.status(200).json({
            code: true,
            message: "OK",
            productPreview,
            average,
            ratings: [{ rating: rating5, star: 5 }, { rating: rating4, star: 4 }, { rating: rating3, star: 3 }, { rating: rating2, star: 2 }, { rating: rating1, star: 1 }]
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.serverReturnReview = async (req, res) => {
    try {
        if(!req.body.id){
            return res.status(400).json({
                code: false,
                message: "Lỗi không có id"
            })
        }
        if(!req.body.comment){
            return res.status(400).json({
                code: false,
                message: "Vui lòng nhập câu trả lời"
            })
        }
        const token = req.cookies.token;
        if(!token){
            return res.status(400).json({
                code: false,
                message: "Lỗi không có token"
            })
        }
        const decode = await jwtUtils.verifyToken(token);
        if(!decode){
            return res.status(400).json({
                code: false,
                message: "Token không hợp lệ"
        })
        }

        const user = await Account.findOne({_id: decode.id}).select("fullname avatar");

        if(!user){
            return res.status(400).json({
                code: false,
                message: "Lỗi không có user"
            })
        }

        const server_return = {
            admin_name: user.fullname,
            role: decode.role,
            avatar: user.avatar,
            comment: req.body.comment,
            createdAt: Date.now()
        }
        await ProductPreview.updateOne(
            {_id: req.body.id},
            {server_return: server_return}
        )
        return res.status(200).json({
            code: true,
            message: "Đã trả lời đánh giá",
            data: {
                id: req.body.id,
                server_return
            }
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}