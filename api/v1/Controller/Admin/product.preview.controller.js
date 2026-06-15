const Product = require("../../Models/products.models");
const Account = require("../../Models/accounts.model");
const ProductPreview = require("../../Models/products.preview");
const jwtUtils = require("../../../../utils/jwt.utils");
const User = require("../../Models/user.models");
const { sendMail } = require("../../../../helper/send.email.helper");

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

        let server_return = {
            admin_name: user.fullname,
            role: decode.role,
            avatar: user.avatar,
            comment: req.body.comment,
            createdAt: Date.now()
        };

        // Nếu là Auto-Pilot gửi, dùng thông tin bot AI
        if (req.body.isAutoPilot) {
            const System = require("../../Models/system.model");
            const systemConfig = await System.findOne({});
            server_return = {
                admin_name: "Veltrix AI",
                role: "Trợ lý Hệ thống",
                avatar: systemConfig?.ai?.botAvatar || "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png",
                comment: req.body.comment,
                createdAt: Date.now()
            };
        }

        await ProductPreview.updateOne(
            {_id: req.body.id},
            {server_return: server_return}
        )

        // Lấy thông tin review để gửi email
        const review = await ProductPreview.findById(req.body.id).populate("product_id", "title slug");
        if (review && review.user_id) {
            const customer = await User.findById(review.user_id);
            if (customer && customer.email) {
                const customerName = customer.fullname || customer.username;
                const productName = review.product_id ? review.product_id.title : "Sản phẩm";
                const productSlug = review.product_id ? review.product_id.slug : "";
                const reviewRating = review.rating;
                const reviewComment = review.comment || review.title || "Đánh giá không có nội dung";
                const adminName = server_return.admin_name;
                const adminRole = server_return.role;
                const adminComment = server_return.comment;
                const subject = `[Veltrix Gear] Phản hồi đánh giá của bạn về ${productName}`;

                const html = `
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    </head>
                    <body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial, sans-serif;">
                        <div style="padding:40px 10px;">
                            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
                                
                                <!-- Header -->
                                <div style="background:linear-gradient(135deg, #020617 0%, #0f172a 100%); padding:30px; text-align:center;">
                                    <img src="https://res.cloudinary.com/dfzgowb54/image/upload/v1774025233/cvrjda3vfurqciminexe.png" alt="Veltrix Gear" style="height:45px; margin-bottom:15px;" />
                                    <h2 style="color:#ffffff; margin:0; font-size:20px; letter-spacing:1px; text-transform: uppercase;">Phản Hồi Đánh Giá</h2>
                                </div>

                                <!-- Body -->
                                <div style="padding:30px;">
                                    <p style="color:#475569; font-size:15px;">Chào <strong>${customerName}</strong>,</p>
                                    <p style="color:#475569; font-size:15px; line-height:1.6;">
                                        Cảm ơn bạn đã để lại đánh giá cho sản phẩm <strong style="color:#0f172a;">${productName}</strong> tại Veltrix Gear.
                                    </p>

                                    <!-- Customer Review -->
                                    <div style="margin-top:25px; padding:20px; background:#f8fafc; border-left:4px solid #0ea5e9; border-radius:0 12px 12px 0;">
                                        <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Đánh giá của bạn (${reviewRating} sao)</div>
                                        <div style="color:#334155; font-size:14px; font-style:italic;">"${reviewComment}"</div>
                                    </div>

                                    <!-- Admin Reply -->
                                    <div style="margin-top:20px; padding:20px; background:#f0fdf4; border-left:4px solid #22c55e; border-radius:0 12px 12px 0;">
                                        <div style="font-size:12px; color:#166534; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Phản hồi từ ${adminName} (${adminRole})</div>
                                        <div style="color:#15803d; font-size:15px; font-weight:500; line-height:1.6;">"${adminComment}"</div>
                                    </div>

                                    <div style="margin-top:30px; text-align:center;">
                                        <a href="https://floren-x-v2-frontend.vercel.app/products/detail/${productSlug}" style="display:inline-block; padding:12px 24px; background:#0284c7; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px; box-shadow:0 4px 12px rgba(2, 132, 199, 0.2);">Xem Lại Sản Phẩm</a>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div style="background:#f8fafc; padding:20px; text-align:center; border-top:1px solid #e2e8f0;">
                                    <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.6;">
                                        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ mục Chat Hỗ Trợ trên website.<br>
                                        © 2026 Veltrix Gear. All rights reserved.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                // Gửi email không đợi (fire and forget) để tránh block API
                sendMail(customer.email, subject, html).catch(err => console.log("Lỗi gửi email phản hồi:", err));
            }
        }

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