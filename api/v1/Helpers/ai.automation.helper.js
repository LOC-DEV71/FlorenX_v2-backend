const Order = require("../Models/order.model");
const ProductStock = require("../Models/product-stock.models");
const InventoryTransaction = require("../Models/InventoryTransaction.models");
const ProductPreview = require("../Models/products.preview");
const Product = require("../Models/products.models");
const User = require("../Models/user.models");
const System = require("../Models/system.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendMail } = require("../../../helper/send.email.helper");

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

        // Nếu đã phản hồi rồi thì bỏ qua
        if (preview.server_return && preview.server_return.comment) {
            return { status: "skipped", message: "Đánh giá này đã được phản hồi rồi" };
        }

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

        const botAvatar = systemConfig.ai?.botAvatar || "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png";

        // === LƯU TRỰC TIẾP VÀO DB ===
        const server_return = {
            admin_name: "Veltrix AI",
            role: "Trợ lý Hệ thống",
            avatar: botAvatar,
            comment: aiResponse,
            createdAt: Date.now()
        };

        await ProductPreview.updateOne(
            { _id: reviewId },
            { server_return: server_return }
        );

        // === GỬI EMAIL CẢM ƠN CHO KHÁCH HÀNG ===
        try {
            const reviewWithProduct = await ProductPreview.findById(reviewId).populate("product_id", "title slug");
            if (reviewWithProduct && reviewWithProduct.user_id) {
                const customer = await User.findById(reviewWithProduct.user_id);
                if (customer && customer.email) {
                    const customerName = customer.fullname || customer.username || "Quý khách";
                    const productName = reviewWithProduct.product_id ? reviewWithProduct.product_id.title : "Sản phẩm";
                    const productSlug = reviewWithProduct.product_id ? reviewWithProduct.product_id.slug : "";
                    const reviewRating = reviewWithProduct.rating;
                    const reviewComment = reviewWithProduct.comment || reviewWithProduct.title || "Đánh giá không có nội dung";
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
                                            <div style="font-size:12px; color:#166534; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Phản hồi từ Veltrix AI (Trợ lý Hệ thống)</div>
                                            <div style="color:#15803d; font-size:15px; font-weight:500; line-height:1.6;">"${aiResponse}"</div>
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
                    // Fire and forget
                    sendMail(customer.email, subject, html).catch(err => console.log("[AI Auto-Pilot] Lỗi gửi email phản hồi:", err));
                    console.log(`[AI Auto-Pilot] Đã gửi email phản hồi đến ${customer.email}`);
                }
            }
        } catch (emailErr) {
            console.log("[AI Auto-Pilot] Lỗi khi xử lý gửi email:", emailErr);
        }

        // Gửi AI text qua socket để FE typing animation (nếu UI đang mở)
        if (io) {
            io.emit("admin_auto_pilot_review_ai_response", {
                reviewId: String(reviewId),
                aiText: aiResponse,
                botAvatar: botAvatar
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
