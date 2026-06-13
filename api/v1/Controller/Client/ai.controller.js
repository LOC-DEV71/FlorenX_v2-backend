const { askGemini } = require("../../Helpers/gemini.helper");
const Product = require("../../Models/products.models");
const ProductCategory = require("../../Models/products.category");
const AiMessage = require("../../Models/ai.message.model");
const jwtHelper = require("../../../../utils/jwt.utils");
const Users = require("../../Models/user.models");
const Orders = require("../../Models/order.model");

// Hàm lấy lịch sử chat
module.exports.getHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await AiMessage.find({ sessionId }).sort({ createdAt: 1 });
        return res.status(200).json({ code: true, data: messages });
    } catch (error) {
        console.error("Lỗi AI Controller getHistory:", error);
        return res.status(500).json({ code: false, message: "Lỗi Server" });
    }
};

// Hàm xử lý chat mới
module.exports.chat = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ code: false, message: "Vui lòng truyền đủ message và sessionId" });
        }

        // 1. Lưu câu hỏi của User vào CSDL
        await AiMessage.create({
            sessionId: sessionId,
            sender: "user",
            text: message
        });

        // 2. Kéo 10 đoạn hội thoại gần nhất lên để làm trí nhớ cho AI
        const recentMessages = await AiMessage.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(10);
        
        recentMessages.reverse(); // Đảo lại cho đúng thứ tự thời gian từ cũ tới mới

        let chatHistory = "Không có lịch sử trò chuyện.";
        if (recentMessages.length > 0) {
            chatHistory = recentMessages.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Veltrix-chan'}: ${h.text}`).join('\n');
        }

        // 3. RAG: Kéo danh mục và sản phẩm từ kho lên
        const categories = await ProductCategory.find({
            deleted: false,
            status: "active"
        }).select("title slug");

        let categoriesContext = "CÁC DANH MỤC SẢN PHẨM HIỆN CÓ:\n";
        categories.forEach(c => {
            categoriesContext += `- ${c.title} (Link: /products/${c.slug})\n`;
        });

        const products = await Product.find({
            deleted: false,
            status: "active"
        }).select("title price discountPercentage slug thumbnail specs").limit(50);

        // Format danh sách sản phẩm thành dạng văn bản dễ đọc cho AI
        let productsContext = "DANH SÁCH CÁC SẢN PHẨM ĐANG BÁN:\n";
        products.forEach((p, index) => {
            const finalPrice = p.price - (p.price * p.discountPercentage / 100);
            // Ép sẵn định dạng Markdown ảnh để AI chỉ việc copy ra
            const mdCode = `[![${p.title}](${p.thumbnail})](/products/detail/${p.slug})`;
            productsContext += `- Tên: ${p.title} | Giá: ${finalPrice.toLocaleString()}đ | Mã Markdown hiển thị ảnh: ${mdCode}\n`;
        });

        // Soft Auth Check: Kéo đơn hàng của khách nếu có đăng nhập
        let ordersContext = "Khách hàng này hiện chưa đăng nhập hoặc chưa có đơn hàng nào.";
        try {
            const token_client = req.cookies?.token_client;
            if (token_client) {
                const decode = await jwtHelper.verifyToken(token_client);
                const user = await Users.findOne({ _id: decode.id }).select("email");
                if (user) {
                    const orders = await Orders.find({ email: user.email }).sort({ createdAt: -1 }).limit(5);
                    if (orders.length > 0) {
                        ordersContext = "DANH SÁCH 5 ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH NÀY:\n";
                        orders.forEach(o => {
                            ordersContext += `- Mã đơn: ${o.code} | Trạng thái: ${o.status} | Tổng tiền: ${o.finalPrice?.toLocaleString()}đ | Ngày đặt: ${o.createdAt?.toLocaleDateString('vi-VN')}\n`;
                        });
                    }
                }
            }
        } catch (e) {
            console.log("AI Soft Auth Check Failed (Guest Mode)");
        }

        // 4. Bơm cho AI đọc và đợi câu trả lời
        const aiResponse = await askGemini(message, categoriesContext, productsContext, chatHistory, ordersContext);

        // 5. Lưu câu trả lời của AI vào CSDL
        await AiMessage.create({
            sessionId: sessionId,
            sender: "bot",
            text: aiResponse
        });

        return res.status(200).json({
            code: true,
            response: aiResponse
        });
    } catch (error) {
        console.error("Lỗi AI Controller chat:", error);
        return res.status(500).json({ code: false, message: "Lỗi Server" });
    }
};
