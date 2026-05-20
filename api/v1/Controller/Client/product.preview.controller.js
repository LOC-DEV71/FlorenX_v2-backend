
const ProductPreview = require("../../Models/products.preview");
const Products = require("../../Models/products.models");
const Orders = require("../../Models/order.model");
const jwtUtils = require("../../../../utils/jwt.utils");
const Notifications = require("../../Models/notification.model");
const Users = require("../../Models/user.models");

module.exports.commentProduct = async (req, res) => {
    try {
        const token_client = req.cookies.token_client;
        const decode = jwtUtils.verifyToken(token_client);

        const user = await Users.findById(decode.id).select("fullname");
        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng",
                code: false,
            });
        }

        // Tạo comment
        const createPreview = new ProductPreview(req.body);
        await createPreview.save();

        // Lấy thông tin sản phẩm
        const product = await Products.findById(createPreview.product_id).select(
            "title slug"
        );

        if (!product) {
            // Nếu sản phẩm không tồn tại thì xóa comment vừa tạo
            await ProductPreview.findByIdAndDelete(createPreview._id);

            return res.status(404).json({
                message: "Không tìm thấy sản phẩm",
                code: false,
            });
        }

        // Tạo notification
        const createNotifi = new Notifications({
            title: "Đánh giá sản phẩm",
            message: `
                <span style="font-weight: 600; color: #ff5151;">
                ${user.fullname}
                </span>
                đã đánh
                <span style="font-weight: 600; color: #faad14;">
                ${createPreview.rating} ★
                </span>
                cho sản phẩm
                <span style="font-weight: 600;">
                ${product.title}
                </span>.
            `,
            type: "rating",
            action_url: `/admin/products/${product.slug}`,
            reference_type: "Product",
            reference_id: product._id,
        });

        await createNotifi.save();

        return res.status(200).json({
            message: "Đánh giá thành công",
            code: true,
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error.message}`,
            code: false,
        });
    }
};

module.exports.getList = async (req, res) => {
    try {
        const product = await Products.findOne({ slug: req.query.slug }).select("_id").lean();
        const productId = product._id.toString();
        const productPreviews = await ProductPreview.find({ product_id: productId });
        const average = productPreviews.length
            ? (productPreviews.reduce((sum, p) => sum + p.rating, 0) / productPreviews.length).toFixed(1)
            : 0;
        const totalRating = productPreviews.length;
        const rating5 = productPreviews.filter(item => item.rating === 5).length / totalRating * 100;
        const rating4 = productPreviews.filter(item => item.rating === 4).length / totalRating * 100;
        const rating3 = productPreviews.filter(item => item.rating === 3).length / totalRating * 100;
        const rating2 = productPreviews.filter(item => item.rating === 2).length / totalRating * 100;
        const rating1 = productPreviews.filter(item => item.rating === 1).length / totalRating * 100;
        return res.status(200).json({
            code: true,
            productPreviews,
            average,
            ratings: [{ rating: rating5, star: 5 }, { rating: rating4, star: 4 }, { rating: rating3, star: 3 }, { rating: rating2, star: 2 }, { rating: rating1, star: 1 }]
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.getProductPreview = async (req, res) => {
    try {
        const token_client = req.cookies.token_client;
        const decode = jwtUtils.verifyToken(token_client);

        const orders = await Orders.find({ email: decode.email, status: "done" })
        const list = orders.map(item => item.products).flat();
        const productIds = [];
        list.forEach(e => {
            productIds.push(e.productId.toString())
        });

        return res.status(200).json({
            code: true,
            productIds
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}