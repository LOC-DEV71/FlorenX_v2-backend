const System = require("../../Models/system.model");
const Order = require("../../Models/order.model");
const Product = require("../../Models/products.models");
const User = require("../../Models/user.models");
const AiMessageAdmin = require("../../Models/ai.message.admin.model");
const Account = require("../../Models/accounts.model");
const Role = require("../../Models/roles.model");
const jwtUtils = require("../../../../utils/jwt.utils");
const { askGeminiAdmin } = require("../../Helpers/gemini.admin.helper");
const { processOrderLogic, processAllOrdersLogic } = require("../../Helpers/ai.automation.helper");
const { getOverviewData } = require("./dashboard.controller");
const PDFDocument = require("pdfkit");
const { uploadRawStream, uploadImageBuffer } = require("../../../../service/cloudinary.service");
const Permission = require("../../Models/permission.models");
const News = require("../../Models/news.model");
const slugify = require("slugify");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { getOnlineAdmins } = require("../../../../socket/admin.presence.socket");

const generatePDFBuffer = (title, content) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            
            const fontPath = path.join(__dirname, "../../../../Roboto-Regular.ttf");
            doc.font(fontPath);
            
            const safeTitle = title ? String(title) : "Tài Liệu Hệ Thống";
            const safeContent = content ? String(content) : "Không có nội dung.";
            
            doc.fontSize(20).text(safeTitle, { align: "center" });
            doc.moveDown();
            
            doc.fontSize(12).text(safeContent, { align: "left" });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// [GET] /api/v1/admin/ai/history
module.exports.history = async (req, res) => {
    try {
        const token = req.cookies.token;
        let userId = "admin_session";
        if (token) {
            const decoded = await jwtUtils.verifyToken(token);
            if (decoded && decoded.id) {
                userId = decoded.id.toString();
            }
        }

        const sessionId = `admin_${userId}`;
        const messages = await AiMessageAdmin.find({ sessionId }).sort({ createdAt: 1 });
        console.log(`HISTORY ENDPOINT: sessionId=${sessionId}, found ${messages.length} messages`);
        res.status(200).json({
            code: 200,
            data: messages
        });
    } catch (error) {
        console.error("Lỗi lấy lịch sử AI:", error);
        res.status(500).json({ code: 500, message: "Lỗi hệ thống" });
    }
};

// [POST] /api/v1/admin/ai/chat
module.exports.chat = async (req, res) => {
    try {
        let { message, chatHistory } = req.body;
        
        let uploadedImages = [];
        let documentContext = "";

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.mimetype.startsWith("image/")) {
                    try {
                        const result = await uploadImageBuffer(file.buffer);
                        if (result && result.secure_url) {
                            uploadedImages.push(result.secure_url);
                        }
                    } catch (err) {
                        console.error("Lỗi upload ảnh:", err);
                    }
                } else if (file.mimetype === "application/pdf") {
                    try {
                        const data = await pdfParse(file.buffer);
                        documentContext += `\n[Nội dung tài liệu PDF: ${file.originalname}]\n${data.text}\n`;
                    } catch (err) {
                        console.error("Lỗi đọc PDF:", err);
                    }
                } else if (
                    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                    file.mimetype === "application/msword"
                ) {
                    try {
                        const result = await mammoth.extractRawText({ buffer: file.buffer });
                        documentContext += `\n[Nội dung tài liệu Word: ${file.originalname}]\n${result.value}\n`;
                    } catch (err) {
                        console.error("Lỗi đọc Word:", err);
                    }
                } else if (file.mimetype === "text/plain") {
                    documentContext += `\n[Nội dung tài liệu Text: ${file.originalname}]\n${file.buffer.toString('utf-8')}\n`;
                }
            }
        }
        
        // Vẫn hỗ trợ fallback nếu frontend truyền images qua string (không có file mới)
        if (req.body.images && uploadedImages.length === 0) {
            uploadedImages = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        }
        if (typeof chatHistory === 'string') {
            try {
                chatHistory = JSON.parse(chatHistory);
            } catch (e) {
                chatHistory = [];
            }
        }

        // Lấy token và quyền của user hiện tại
        const token = req.cookies.token;
        let userPermissions = [];
        let userId = "admin_session";
        if (token) {
            const decoded = await jwtUtils.verifyToken(token);
            if (decoded && decoded.id) {
                userId = decoded.id.toString();
                const exitAccount = await Account.findOne({ _id: decoded.id, role_slug: decoded.role }).lean();
                if (exitAccount) {
                    const exitRole = await Role.findOne({ slug: exitAccount.role_slug }).lean();
                    userPermissions = exitRole?.permissions || [];
                }
            }
        }

        // Lưu tin nhắn của User
        if (message) {
            await AiMessageAdmin.create({ sessionId: `admin_${userId}`, sender: "user", text: message });
        }
        
        let permissionsContext = "";
        if (userPermissions.length === 0) {
            permissionsContext = "KHÔNG CÓ QUYỀN GÌ CẢ (CHỈ LÀ NHÂN VIÊN QUÈN / THỰC TẬP SINH)";
        } else if (userPermissions.length < 5) {
            permissionsContext = `CÓ RẤT ÍT QUYỀN (CHỈ LÀ NHÂN VIÊN BÌNH THƯỜNG): ${userPermissions.join(", ")}`;
        } else {
            permissionsContext = userPermissions.join(", ");
        }

        // Lấy danh sách toàn bộ các quyền mà hệ thống hỗ trợ
        const allPermissionDocs = await Permission.find({}).lean();
        const systemPermissionsContext = allPermissionDocs.map(g => g.permissions.map(p => p.value)).flat().join(", ");

        // Lấy danh sách quản trị viên đang online (sử dụng io được lưu toàn cục)
        const onlineAdmins = getOnlineAdmins(req);
        const onlineContext = onlineAdmins.length > 0
            ? onlineAdmins.map(a => `${a.fullname} (Chức vụ: ${a.role})`).join(", ")
            : "Hiện tại hệ thống không ghi nhận quản trị viên nào khác đang online ngoài bạn.";

        let dashboardContext = `
DỮ LIỆU TỔNG QUAN:
[TỪ CHỐI TRUY CẬP] Tài khoản hiện tại KHÔNG CÓ QUYỀN (view_dashboard) để xem dữ liệu thống kê, doanh thu, hay tổng số liệu đơn hàng. Tuyệt đối KHÔNG báo cáo doanh thu hay số liệu nào khác, và hãy dựa vào sự thiếu sót quyền hạn này để mỉa mai tài khoản.
- DANH SÁCH NHÂN SỰ ĐANG ONLINE (LƯU Ý QUAN TRỌNG: NẾU SẾP HỎI 'CÓ ADMIN NÀO ONLINE KHÔNG' HOẶC 'CÓ AI ONLINE KHÔNG', BẠN PHẢI ĐỌC HẾT TẤT CẢ DANH SÁCH SAU ĐÂY VÀ KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ AI DÙ HỌ CHỈ LÀ CSKH): ${onlineContext}
`;

        if (userPermissions.includes("view_dashboard") || userPermissions.includes("view_orders")) {
            // Thu thập tổng quan hệ thống để làm Context
            const totalOrders = await Order.countDocuments();
            const pendingOrders = await Order.countDocuments({ status: "pending" });
            const processingOrders = await Order.countDocuments({ status: "processing" });
            const totalProducts = await Product.countDocuments({ status: "active" });
            const totalUsers = await User.countDocuments({ status: "active" });

            // Tính tổng doanh thu (chỉ tính đơn hàng đã được giao thành công hoặc đã xử lý)
            const completedOrders = await Order.find({ status: { $in: ["delivered", "success", "processing", "shipped", "done"] } });
            let totalRevenue = 0;
            completedOrders.forEach(order => {
                totalRevenue += order.finalPrice || order.totalPrice || 0;
            });

            // Đơn hàng đang giao (shipped)
            const shippedOrdersCount = await Order.countDocuments({ status: "shipped" });

            // Lấy 3 đơn hàng mới nhất
            const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(3);
            const recentOrdersText = recentOrders.map(o => `- Mã: ${o.code} | Khách: ${o.fullname || o.email} | Trạng thái: ${o.status} | Tổng tiền: ${o.finalPrice || o.totalPrice}`).join("\n");

            // Định dạng tiền tệ VND
            const formattedRevenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue);

            dashboardContext = `
DỮ LIỆU TỔNG QUAN:
- Tổng số đơn hàng trong hệ thống: ${totalOrders}
- Đơn hàng chờ duyệt (pending): ${pendingOrders}
- Đơn hàng đang xử lý (processing): ${processingOrders}
- Đơn hàng đang vận chuyển (shipped): ${shippedOrdersCount}
- Tổng số sản phẩm đang bán: ${totalProducts}
- Tổng số khách hàng: ${totalUsers}
- Tổng doanh thu ước tính: ${formattedRevenue}

- DANH SÁCH NHÂN SỰ ĐANG ONLINE (LƯU Ý QUAN TRỌNG: NẾU SẾP HỎI 'CÓ ADMIN NÀO ONLINE KHÔNG' HOẶC 'CÓ AI ONLINE KHÔNG', BẠN PHẢI ĐỌC HẾT TẤT CẢ DANH SÁCH SAU ĐÂY VÀ KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ AI DÙ HỌ CHỈ LÀ CSKH): ${onlineContext}

3 ĐƠN HÀNG MỚI NHẤT VỪA ĐẶT:
${recentOrdersText || "Chưa có đơn hàng nào."}
            `;
        }

        // Callback function để AI gọi khi cần xử lý
        const processOrderCallback = async (functionName, args) => {
            if (functionName === "processOrder") {
                const hasUpdateOrder = userPermissions.includes("update_orders");
                const hasProducts = userPermissions.includes("view_products") || userPermissions.includes("update_products");
                
                if (!hasUpdateOrder || !hasProducts) {
                    return {
                        status: "error",
                        message: "Từ chối thực thi do Sếp thiếu quyền quản lý đơn hàng hoặc sản phẩm."
                    };
                }
                
                if (args.processAll === true) {
                    return await processAllOrdersLogic();
                } else if (args.orderCode) {
                    return await processOrderLogic(args.orderCode);
                } else {
                    return { status: "error", message: "Không rõ lệnh. Vui lòng cung cấp mã đơn hàng cụ thể hoặc yêu cầu duyệt tất cả." };
                }
            }
            
            if (functionName === "toggleAutoProcessOrders") {
                const hasSystemManage = userPermissions.includes("system_management");
                const hasOrderManage = userPermissions.includes("update_orders");
                const hasProductManage = userPermissions.includes("update_products");

                if (!hasSystemManage || !hasOrderManage || !hasProductManage) {
                    return { 
                        status: "error", 
                        message: "Từ chối thực thi: Sếp cần có đồng thời cả 3 quyền 'system_management', 'update_orders', và 'update_products' để bật tắt Auto-Pilot." 
                    };
                }
                const system = await System.findOne({});
                if (!system) return { status: "error", message: "Không tìm thấy cấu hình hệ thống." };
                
                await System.updateOne(
                    { _id: system._id },
                    { $set: { "ai.autoProcessOrders": args.status } }
                );
                
                return { status: "success", message: `Đã ${args.status ? "BẬT" : "TẮT"} chế độ duyệt đơn tự động thành công.` };
            }
            
            if (functionName === "getDashboardStats") {
                if (!userPermissions.includes("view_dashboard")) {
                    return { status: "error", message: "Từ chối cung cấp số liệu do Sếp chưa được cấp quyền truy cập Dashboard." };
                }
                const year = args.year || new Date().getFullYear();
                const data = await getOverviewData(year);
                return { status: "success", data };
            }
            
            if (functionName === "generatePDF") {
                try {
                    const pdfBuffer = await generatePDFBuffer(args.title, args.content);
                    const uploadResult = await uploadRawStream(pdfBuffer);
                    return { 
                        status: "success", 
                        message: "Đã tạo PDF thành công. Trả về đường link.",
                        pdfUrl: uploadResult.secure_url 
                    };
                } catch (err) {
                    console.error("PDF Generate error:", err);
                    return { status: "error", message: `Không thể tạo file PDF do lỗi: ${err.message}` };
                }
            }
            
            if (functionName === "getOrderDetails") {
                if (!userPermissions.includes("view_orders")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền 'view_orders'." };
                }
                const order = await Order.findOne({ code: args.orderCode }).lean();
                if (!order) return { status: "error", message: "Không tìm thấy đơn hàng này." };
                return { status: "success", data: order };
            }
            
            if (functionName === "getExportReceiptDetails") {
                if (!userPermissions.includes("view_products") && !userPermissions.includes("update_products")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền quản lý sản phẩm." };
                }
                const InventoryTransaction = require("../../Models/InventoryTransaction.models");
                const receipt = await InventoryTransaction.findOne({ ref_id: args.receiptCode }).populate("product_id", "title").populate("warehouse_id", "title").lean();
                if (!receipt) return { status: "error", message: "Không tìm thấy phiếu xuất kho này." };
                return { status: "success", data: receipt };
            }

            if (functionName === "searchProducts" || functionName === "findProduct") {
                if (!userPermissions.includes("view_products")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền 'view_products'." };
                }
                const keyword = args.keyword || "";
                const products = await Product.find({ 
                    title: { $regex: keyword, $options: "i" },
                    deleted: false
                }).select("title slug description price discountPercentage stock thumbnail images specs").limit(5).lean();
                if (products.length === 0) return { status: "error", message: "Không tìm thấy sản phẩm nào khớp với từ khóa." };
                return { status: "success", data: products };
            }

            if (functionName === "createArticle") {
                if (!userPermissions.includes("create_news")) {
                    return { status: "error", message: "Hệ thống từ chối: Sếp không có quyền tạo bài viết (create_news)." };
                }
                try {
                    // Chấp nhận ảnh thật từ findProduct HOẶC ảnh AI tự tạo từ Pollinations
                    let thumbnailUrl = args.thumbnail_url || "";
                    if (thumbnailUrl.includes("pollinations.ai")) {
                        // URL encode để tránh lỗi ký tự tiếng Việt hoặc khoảng trắng làm vỡ ảnh
                        thumbnailUrl = encodeURI(thumbnailUrl);
                    }

                    // Robot Mode: Trả draftPayload về Frontend để hiển thị visual auto-fill
                    return { 
                        status: "success", 
                        message: `Thưa Sếp, em đã soạn xong bài viết "${args.title}". Hệ thống đang chuyển hướng Sếp đến trang tạo bài để Sếp xem em tự điền thông tin. 🤖`,
                        action: "auto_create_news",
                        draftPayload: {
                            title: args.title,
                            slug_category: args.slug_category,
                            description: args.description,
                            content: args.content,
                            thumbnailUrl: thumbnailUrl,
                            status: "published",
                            featured: "yes"
                        }
                    };
                } catch (e) {
                    console.error("Lỗi khi AI viết bài:", e);
                    return { status: "error", message: `Đã xảy ra lỗi khi tạo bài viết: ${e.message}` };
                }
            }
        };

        const aiResult = await askGeminiAdmin(message, dashboardContext, chatHistory, permissionsContext, systemPermissionsContext, processOrderCallback, uploadedImages, documentContext);

        const replyText = typeof aiResult === 'string' ? aiResult : aiResult.text;

        // Lưu tin nhắn của AI
        await AiMessageAdmin.create({ sessionId: `admin_${userId}`, sender: "ai", text: replyText });

        res.status(200).json({
            code: 200,
            reply: replyText,
            action: aiResult.action,
            draftPayload: aiResult.draftPayload
        });
    } catch (error) {
        console.error("Lỗi AI Controller Admin:", error);
        require("fs").appendFileSync("error.log", error.stack + "\n");
        res.status(500).json({ code: 500, message: "Lỗi hệ thống AI Admin: " + error.message });
    }
};
