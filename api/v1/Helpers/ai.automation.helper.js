const Order = require("../Models/order.model");
const ProductStock = require("../Models/product-stock.models");
const InventoryTransaction = require("../Models/InventoryTransaction.models");
const ProductPreview = require("../Models/products.preview");
const Product = require("../Models/products.models");
const User = require("../Models/user.models");
const System = require("../Models/system.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendMail } = require("../../../helper/send.email.helper");

// Hàm ngầm kiểm tra và cảnh báo tồn kho thấp
async function checkLowStockAndNotify(productId, productTitle, currentStock, io) {
    if (currentStock >= 5) return;
    
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const exports = await InventoryTransaction.find({
            product_id: productId,
            type: "export",
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        let soldQuantity = 0;
        exports.forEach(exp => {
            soldQuantity += (exp.quantity || 0);
        });
        
        let suggestedAmount = soldQuantity;
        if (suggestedAmount < 20) suggestedAmount = 20; // Nhập tối thiểu 20
        
        if (io) {
            io.emit("admin_direct_message", {
                message: `⚠️ [CẢNH BÁO KHO] Sản phẩm '${productTitle}' sắp cháy hàng (chỉ còn ${currentStock} cái). Em đề xuất nhập thêm ${suggestedAmount} cái. Sếp hãy gõ 'Duyệt phiếu nhập ${productTitle} ${suggestedAmount} cái' để em tự lên phiếu và chốt đơn với Nhà cung cấp nhé!`,
                from: "AI Veltrix-chan (Quản lý kho)"
            });
        }
    } catch (e) {
        console.error("Lỗi khi check tồn kho ngầm:", e);
    }
}

// Logic thực thi Đơn hàng tự động
async function processOrderLogic(orderCode, io) {
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

            // Cảnh báo tồn kho thấp
            checkLowStockAndNotify(prod.productId, prod.title, stock.quantity, io);
        }

        // 3. Đổi trạng thái đơn hàng sang vận chuyển
        order.status = "shipped";
        await order.save();

        return { status: "success", message: `Đã xác nhận, xuất kho và chuyển đơn hàng ${orderCode} sang trạng thái Vận chuyển (shipped).` };
    } catch (e) {
        return { status: "error", message: `Lỗi hệ thống: ${e.message}` };
    }
}

// Logic thực thi duyệt TẤT CẢ đơn hàng pending (Hỗ trợ chạy ngầm Hybrid)
async function processAllOrdersLogic(io) {
    try {
        const pendingOrders = await Order.find({ status: "pending" });
        if (pendingOrders.length === 0) return { status: "success", message: "Hiện không có đơn hàng nào đang chờ duyệt." };

        const MAX_SYNC_ORDERS = 6;
        
        // Hàm phụ xử lý 1 mảng đơn hàng
        const processOrdersBatch = async (orders) => {
            let successCount = 0;
            let failCount = 0;
            let failMessages = [];
            let successCodes = [];

            for (const order of orders) {
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

                    // Cảnh báo tồn kho thấp
                    checkLowStockAndNotify(prod.productId, prod.title, stock.quantity, io);
                }

                order.status = "shipped";
                await order.save();
                successCount++;
                successCodes.push(order.code);
            }
            return { successCount, failCount, failMessages, successCodes };
        };

        if (pendingOrders.length <= MAX_SYNC_ORDERS) {
            // Xử lý đồng bộ toàn bộ nếu số lượng nhỏ
            const result = await processOrdersBatch(pendingOrders);
            let finalMsg = `Đã duyệt thành công ${result.successCount} đơn hàng${result.successCount > 0 ? ` (Mã: ${result.successCodes.join(", ")})` : ""}. `;
            if (result.failCount > 0) {
                finalMsg += `Có ${result.failCount} đơn thất bại do thiếu tồn kho. Chi tiết: ${result.failMessages.join(" ")}`;
            }
            return { status: "success", message: finalMsg };
        } else {
            // NẾU SỐ LƯỢNG LỚN: Cắt 6 đơn đầu xử lý ngay để trả kết quả cho AI
            const syncOrders = pendingOrders.slice(0, MAX_SYNC_ORDERS);
            const asyncOrders = pendingOrders.slice(MAX_SYNC_ORDERS);

            const syncResult = await processOrdersBatch(syncOrders);
            
            // XỬ LÝ NGẦM PHẦN CÒN LẠI
            (async () => {
                try {
                    const asyncResult = await processOrdersBatch(asyncOrders);
                    
                    let finalMsg = `[Background Job] Hệ thống duyệt ngầm hoàn tất! Đã duyệt thành công ${asyncResult.successCount} đơn hàng. `;
                    if (asyncResult.failCount > 0) {
                        finalMsg += `Có ${asyncResult.failCount} đơn thất bại do thiếu tồn kho.`;
                    }
                    
                    if (io) {
                        io.emit("admin_direct_message", {
                            message: finalMsg,
                            from: "AI Veltrix-chan (Hệ thống ngầm)"
                        });
                        // Có thể emit thêm một event để frontend reload danh sách đơn hàng nếu Sếp đang ở trang orders
                        // io.emit("admin_orders_updated");
                    }
                } catch (err) {
                    console.error("Lỗi khi xử lý đơn ngầm:", err);
                    if (io) {
                        io.emit("admin_direct_message", {
                            message: `[Background Job] Hệ thống gặp sự cố khi duyệt ngầm: ${err.message}`,
                            from: "AI Veltrix-chan (Hệ thống ngầm)"
                        });
                    }
                }
            })(); // Gọi ngay IIFE (Immediately Invoked Function Expression)

            // Lập tức trả về kết quả 6 đơn đầu cho AI
            let initialMsg = `Đã duyệt nhanh thành công ${syncResult.successCount} đơn hàng đầu tiên. `;
            if (syncResult.failCount > 0) {
                initialMsg += `Có ${syncResult.failCount} đơn thất bại do thiếu tồn kho. `;
            }
            initialMsg += `Tuy nhiên, còn tới ${asyncOrders.length} đơn hàng nữa nên hệ thống ĐANG TỰ ĐỘNG CHẠY NGẦM. Sếp cứ đi làm việc khác, vui lòng chờ thông báo Popup (Direct Message) trên góc màn hình khi duyệt xong hoàn toàn nhé!`;
            
            return { status: "success", message: initialMsg };
        }

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

// Logic Auto-Marketing: Dọn kho hàng ế
async function autoMarketingLogic(io) {
    try {
        const systemConfig = await System.findOne({});
        if (!systemConfig || !systemConfig.ai || !systemConfig.ai.apiKey) {
            return { status: "error", message: "Chưa cấu hình API Key của AI" };
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Tìm các sản phẩm đang active
        const allProducts = await Product.find({ deleted: false, status: "active" });
        if (!allProducts || allProducts.length === 0) {
            return { status: "error", message: "Hệ thống chưa có sản phẩm nào để marketing." };
        }

        // Tìm các product_id đã được xuất kho trong 30 ngày qua
        const recentExports = await InventoryTransaction.find({ 
            type: "export", 
            createdAt: { $gte: thirtyDaysAgo } 
        }).distinct("product_id");

        // Lọc ra sản phẩm ế (Không có giao dịch xuất kho nào gần đây)
        const deadProducts = allProducts.filter(p => !recentExports.some(id => id.toString() === p._id.toString()));
        
        if (deadProducts.length === 0) {
            return { status: "success", message: "Tuyệt vời! Hệ thống không có sản phẩm nào bị ế trong 30 ngày qua." };
        }

        // Chọn ngẫu nhiên 1 sản phẩm ế để làm marketing
        const targetProduct = deadProducts[Math.floor(Math.random() * deadProducts.length)];

        // Gọi AI viết bài SEO
        const aiModel = systemConfig.ai?.model || "gemini-1.5-flash";
        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);
        const model = genAI.getGenerativeModel({ model: aiModel });
        
        const prompt = `Viết một bài PR sản phẩm dài khoảng 300 từ chuẩn SEO cực kỳ hấp dẫn về sản phẩm sau để kích cầu mua sắm.
Tên sản phẩm: ${targetProduct.title}
Mô tả ngắn: ${targetProduct.description || "Một sản phẩm tuyệt vời từ Veltrix Gear."}
Giá: ${targetProduct.price.toLocaleString()} VNĐ

Yêu cầu:
- Viết dưới dạng 1 bài viết HTML chuẩn SEO (chỉ dùng các thẻ h2, p, strong, ul, li).
- KHÔNG CẦN thẻ <html>, <head>, hay <body>, CHỈ TRẢ VỀ NỘI DUNG HTML bên trong.
- Giọng văn: Lôi cuốn, thú vị, thuyết phục khách hàng chốt đơn ngay.
- Kết thúc bằng một lời kêu gọi hành động (Call To Action) nhắc họ sử dụng mã giảm giá 10% độc quyền.`;

        const result = await model.generateContent(prompt);
        let htmlContent = result.response.text().trim();
        if(htmlContent.startsWith("\`\`\`html")) {
            htmlContent = htmlContent.replace(/\`\`\`html/g, "").replace(/\`\`\`/g, "").trim();
        }

        // Đăng bài viết lên mục News
        const News = require("../Models/news.model");
        const slugify = require("slugify");
        const articleSlug = slugify(targetProduct.title + "-giam-gia-soc-" + Date.now(), { lower: true });
        
        const newArticle = await News.create({
            title: `[Siêu Deal] Tại sao bạn nên sở hữu ngay ${targetProduct.title} trong tháng này?`,
            slug: articleSlug,
            content: htmlContent,
            description: `Khám phá ngay lý do ${targetProduct.title} đang là sản phẩm đáng mua nhất với ưu đãi độc quyền 10%.`,
            thumbnail: targetProduct.thumbnail,
            status: "published",
            createdBy: { fullname: "Veltrix AI (Auto-Marketing)" }
        });

        // Tạo Voucher giảm giá 10%
        const Voucher = require("../Models/vouchers.model");
        const voucherCode = `DONKHO-${targetProduct.slug.toUpperCase().slice(0, 5)}-${Math.floor(Math.random() * 1000)}`;
        
        await Voucher.create({
            code: voucherCode,
            description: `Giảm 10% cho ${targetProduct.title} - AI Auto-Marketing`,
            discountType: "percentage",
            discountValue: 10,
            maxDiscount: 500000,
            minOrderValue: 0,
            quantity: 100,
            isActive: true
        });

        // Bắn Email hàng loạt chạy ngầm
        (async () => {
            try {
                const users = await User.find({ deleted: false, status: "active" });
                const subject = `🔥 Ưu đãi độc quyền 10% cho ${targetProduct.title} - Chỉ dành riêng cho bạn!`;
                // URL mẫu cho Frontend
                const articleUrl = `https://floren-x-v2-frontend.vercel.app/news/detail/${articleSlug}`;
                const productUrl = `https://floren-x-v2-frontend.vercel.app/products/detail/${targetProduct.slug}`;
                
                let sentCount = 0;
                for (const user of users) {
                    if (user.email) {
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                <h2 style="color: #0ea5e9; text-align: center;">Veltrix Gear Dọn Kho Giá Sốc</h2>
                                <p>Chào <strong>${user.fullname || "bạn"}</strong>,</p>
                                <p>Veltrix Gear dành tặng bạn mã giảm giá <strong>10%</strong> (Tối đa 500k) khi mua siêu phẩm <strong>${targetProduct.title}</strong>.</p>
                                <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 14px; color: #64748b;">Mã ưu đãi của bạn:</p>
                                    <p style="margin: 10px 0 0 0; font-size: 24px; color: #e11d48; font-weight: bold; letter-spacing: 2px;">${voucherCode}</p>
                                </div>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="${productUrl}" style="background: #0ea5e9; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">ĐẶT HÀNG NGAY</a>
                                </div>
                                <p style="margin-top: 30px;">Hoặc đọc bài đánh giá chi tiết của Veltrix về sản phẩm này tại đây: <a href="${articleUrl}" style="color: #0ea5e9;">Xem bài viết</a></p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Email này được tự động gửi bởi Hệ thống AI Veltrix-chan.</p>
                            </div>
                        `;
                        // Fire and forget
                        sendMail(user.email, subject, emailHtml).catch(e => console.error(e));
                        sentCount++;
                    }
                }

                if (io) {
                    io.emit("admin_direct_message", {
                        message: `🎯 [MARKETING THÀNH CÔNG] Chiến dịch dọn kho cho '${targetProduct.title}' đã chạy xong. Đã tạo bài SEO, tạo mã '${voucherCode}' và gửi email đến ${sentCount} khách hàng!`,
                        from: "AI Veltrix-chan (Marketing)"
                    });
                }
            } catch (err) {
                console.error("Auto-Marketing Error:", err);
            }
        })();

        return { 
            status: "success", 
            message: `Em đã chọn sản phẩm '${targetProduct.title}' để dọn kho. Bài Blog chuẩn SEO và mã Voucher '${voucherCode}' đã được khởi tạo. Hệ thống đang tiến hành rải Email ngầm cho khách hàng cũ, Sếp chờ xem thông báo nhé!` 
        };

    } catch (e) {
        return { status: "error", message: `Auto-Marketing Error: ${e.message}` };
    }
}

module.exports = {
    processOrderLogic,
    processAllOrdersLogic,
    processReviewLogic,
    autoMarketingLogic
};
