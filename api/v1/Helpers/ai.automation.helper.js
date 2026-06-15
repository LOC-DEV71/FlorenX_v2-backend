const Order = require("../Models/order.model");
const ProductStock = require("../Models/product-stock.models");
const InventoryTransaction = require("../Models/InventoryTransaction.models");
const ProductPreview = require("../Models/products.preview");
const System = require("../Models/system.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Logic thực thi Đơn hàng tự động
async function processOrderLogic(orderCode) {
    try {
        const order = await Order.findOne({ code: orderCode });
        if (!order) return { status: "error", message: `Không tìm thấy đơn hàng mã ${orderCode}` };
        if (order.status !== "pending" && order.status !== "confirmed") return { status: "error", message: `Đơn hàng đang ở trạng thái '${order.status}', không thể xuất kho` };

        // 1. Kiểm tra tồn kho trước khi xuất
        for (const prod of order.products) {
            const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
            if (!stock) {
                return { status: "error", message: `Sản phẩm '${prod.title}' không có kho nào đủ tồn kho (cần ${prod.quantity}).` };
            }
        }

        // 2. Đủ tồn kho => Trừ kho và tạo phiếu xuất
        for (const prod of order.products) {
            const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
            stock.quantity -= prod.quantity;
            await stock.save();

            await InventoryTransaction.create({
                type: "export",
                product_id: prod.productId,
                warehouse_id: stock.warehouse_id,
                quantity: prod.quantity,
                ref_id: `EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                export_date: new Date(),
                ref_name: orderCode,
                note: `AI Tự động duyệt đơn và xuất kho cho khách ${order.fullname || "Khách mua hàng"}`
            });
        }

        // 3. Đổi trạng thái đơn hàng sang vận chuyển
        order.status = "shipped";
        await order.save();

        return { status: "success", message: `Đã xác nhận, xuất kho và chuyển đơn hàng ${orderCode} sang trạng thái Vận chuyển (shipped).` };
    } catch (e) {
        return { status: "error", message: `Lỗi hệ thống: ${e.message}` };
    }
}

// Logic thực thi duyệt TẤT CẢ đơn hàng pending
async function processAllOrdersLogic() {
    try {
        const pendingOrders = await Order.find({ status: "pending" });
        if (pendingOrders.length === 0) return { status: "success", message: "Hiện không có đơn hàng nào đang chờ duyệt." };

        let successCount = 0;
        let failCount = 0;
        let failMessages = [];
        let successCodes = [];
        
        for (const order of pendingOrders) {
            let enoughStock = true;
            for (const prod of order.products) {
                const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
                if (!stock) {
                    enoughStock = false;
                    failMessages.push(`Đơn ${order.code} thiếu hàng (${prod.title}).`);
                    break;
                }
            }

            if (!enoughStock) {
                failCount++;
                continue;
            }

            for (const prod of order.products) {
                const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
                stock.quantity -= prod.quantity;
                await stock.save();

                await InventoryTransaction.create({
                    type: "export",
                    product_id: prod.productId,
                    warehouse_id: stock.warehouse_id,
                    quantity: prod.quantity,
                    ref_id: `EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                    export_date: new Date(),
                    ref_name: order.code,
                    note: `AI Tự động duyệt đơn và xuất kho cho khách ${order.fullname || "Khách mua hàng"}`
                });
            }

            order.status = "shipped";
            await order.save();
            successCount++;
            successCodes.push(order.code);
        }

        let finalMsg = `Đã duyệt thành công ${successCount} đơn hàng${successCount > 0 ? ` (Mã: ${successCodes.join(", ")})` : ""}. `;
        if (failCount > 0) {
            finalMsg += `Có ${failCount} đơn thất bại do thiếu tồn kho. Chi tiết: ${failMessages.join(" ")}`;
        }
        return { status: "success", message: finalMsg };
    } catch (e) {
        return { status: "error", message: `Lỗi hệ thống: ${e.message}` };
    }
}

// Logic tự động phản hồi đánh giá sản phẩm bằng AI
async function processReviewLogic(reviewId, io) {
    try {
        const preview = await ProductPreview.findById(reviewId);
        if (!preview) return { status: "error", message: "Không tìm thấy đánh giá" };

        const systemConfig = await System.findOne({});
        if (!systemConfig || !systemConfig.ai || !systemConfig.ai.apiKey) {
             return { status: "error", message: "Chưa cấu hình API Key của AI" };
        }

        const aiModel = systemConfig.ai?.model || "gemini-1.5-flash";
        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);
        const model = genAI.getGenerativeModel({ model: aiModel });

        const prompt = `Bạn là Veltrix AI, một trợ lý chăm sóc khách hàng chuyên nghiệp của cửa hàng Veltrix Gear (bán linh kiện, laptop, PC gaming).
Khách hàng vừa để lại đánh giá cho sản phẩm của chúng ta với số điểm: ${preview.rating} sao.
Tiêu đề đánh giá: "${preview.title || ''}"
Nội dung đánh giá của khách hàng: "${preview.comment || 'Không có bình luận'}"

Nhiệm vụ của bạn: Hãy viết MỘT đoạn phản hồi ngắn gọn (dưới 50 từ), lịch sự, tự nhiên và KHÔNG rập khuôn.
- Nếu đánh giá từ 4-5 sao: Cảm ơn khách hàng đã ủng hộ và chúc họ có trải nghiệm tuyệt vời.
- Nếu đánh giá từ 1-3 sao: Xin lỗi chân thành về trải nghiệm chưa tốt, giải thích nhẹ nhàng hoặc mời họ liên hệ qua mục Chat với AI/nhân viên để được hỗ trợ bảo hành hoặc đổi trả. Không bao giờ cãi lại khách hàng.
Chỉ trả về nội dung câu trả lời, không có định dạng markdown phức tạp hay giải thích thêm.`;

        const result = await model.generateContent(prompt);
        let aiResponse = result.response.text().trim();

        // KHÔNG lưu DB ở đây! Gửi AI text qua socket để FE typing animation rồi gọi API lưu
        if (io) {
            io.emit("admin_auto_pilot_review_ai_response", {
                reviewId: String(reviewId),
                aiText: aiResponse,
                botAvatar: systemConfig.ai?.botAvatar || "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png"
            });
        }

        return { status: "success", message: "AI đã sinh câu trả lời", aiText: aiResponse };
    } catch (e) {
        return { status: "error", message: `AI Error: ${e.message}` };
    }
}

module.exports = {
    processOrderLogic,
    processAllOrdersLogic,
    processReviewLogic
};
