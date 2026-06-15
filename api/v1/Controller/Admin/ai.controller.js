const System = require("../../Models/system.model");
const Order = require("../../Models/order.model");
const Product = require("../../Models/products.models");
const User = require("../../Models/user.models");
const AiMessageAdmin = require("../../Models/ai.message.admin.model");
const Account = require("../../Models/accounts.model");
const Role = require("../../Models/roles.model");
const ActivityLog = require("../../Models/activityLog.model");
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

// Bộ đếm vi phạm truy cập trái phép
const unauthorizedAttempts = new Map();

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
        // chatHistory từ Frontend có thể là mảng JSON hoặc là chuỗi văn bản đã định dạng sẵn
        let formattedHistory = "";
        if (typeof chatHistory === 'string') {
            try {
                const parsed = JSON.parse(chatHistory);
                if (Array.isArray(parsed)) {
                    formattedHistory = parsed.map(msg => `${msg.sender === 'user' ? 'Sếp' : 'AI'}: ${msg.text}`).join("\n");
                } else {
                    formattedHistory = chatHistory; // Nếu không phải mảng JSON, giữ nguyên chuỗi
                }
            } catch (e) {
                // Nếu JSON.parse lỗi, có nghĩa nó đã là chuỗi được format từ Frontend
                formattedHistory = chatHistory;
            }
        } else if (Array.isArray(chatHistory)) {
            formattedHistory = chatHistory.map(msg => `${msg.sender === 'user' ? 'Sếp' : 'AI'}: ${msg.text}`).join("\n");
        }

        // Lấy token và quyền của user hiện tại
        const token = req.cookies.token;
        let userPermissions = [];
        let userId = "admin_session";
        let roleTitle = "";
        if (token) {
            const decoded = await jwtUtils.verifyToken(token);
            if (decoded && decoded.id) {
                userId = decoded.id.toString();
                const exitAccount = await Account.findOne({ _id: decoded.id, role_slug: decoded.role }).lean();
                if (exitAccount) {
                    const exitRole = await Role.findOne({ slug: exitAccount.role_slug }).lean();
                    userPermissions = exitRole?.permissions || [];
                    roleTitle = exitRole?.title || "";
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

        let currentUserInfo = "Bạn đang chat với một nhân sự hệ thống.";
        let currentUserName = "Nhân viên";
        if (token) {
            const decoded = await jwtUtils.verifyToken(token);
            if (decoded && decoded.id) {
                const exitAccount = await Account.findOne({ _id: decoded.id }).lean();
                if (exitAccount) {
                    currentUserName = exitAccount.fullname;
                    currentUserInfo = `BẠN ĐANG TRỰC TIẾP CHAT VỚI: ${exitAccount.fullname} (Chức vụ: ${roleTitle}). `;
                    if (roleTitle.toLowerCase().includes("super admin")) {
                        currentUserInfo += "ĐÂY LÀ SẾP LỚN CAO NHẤT! BẠN PHẢI TUYỆT ĐỐI TÔN TRỌNG VÀ GỌI LÀ SẾP.";
                    } else {
                        currentUserInfo += "ĐÂY CHỈ LÀ NHÂN VIÊN. KHÔNG ĐƯỢC GỌI LÀ SẾP NỮA. NẾU NHÂN VIÊN YÊU CẦU TRUY VẤN TÍNH NĂNG MÀ HỌ KHÔNG CÓ QUYỀN (bị hệ thống từ chối hoặc bạn thấy họ không có quyền), BẠN BẮT BUỘC PHẢI GỌI CÔNG CỤ reportUnauthorizedAction ĐỂ GHI NHẬN VI PHẠM. Hệ thống sẽ tự động đếm và báo cáo Super Admin!";
                    }
                }
            }
        }

        let dashboardContext = `
${currentUserInfo}
DỮ LIỆU TỔNG QUAN:
[TỪ CHỐI TRUY CẬP] Tài khoản hiện tại KHÔNG CÓ QUYỀN (view_dashboard) để xem dữ liệu thống kê, doanh thu, hay tổng số liệu đơn hàng. Tuyệt đối KHÔNG báo cáo doanh thu hay số liệu nào khác, và hãy dựa vào sự thiếu sót quyền hạn này để mỉa mai tài khoản.
- DANH SÁCH NHÂN SỰ ĐANG ONLINE (LƯU Ý QUAN TRỌNG: NẾU HỌ HỎI 'CÓ ADMIN NÀO ONLINE KHÔNG' HOẶC 'CÓ AI ONLINE KHÔNG', BẠN PHẢI ĐỌC HẾT TẤT CẢ DANH SÁCH SAU ĐÂY VÀ KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ AI DÙ HỌ CHỈ LÀ CSKH): ${onlineContext}
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
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin && !userPermissions.includes("view_orders")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền 'view_orders'." };
                }
                const order = await Order.findOne({ code: args.orderCode }).lean();
                if (!order) return { status: "error", message: "Không tìm thấy đơn hàng này." };
                return { status: "success", data: order };
            }
            
            if (functionName === "getExportReceiptDetails") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin && !userPermissions.includes("view_products") && !userPermissions.includes("update_products")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền quản lý sản phẩm." };
                }
                const InventoryTransaction = require("../../Models/InventoryTransaction.models");
                const receipt = await InventoryTransaction.findOne({ ref_id: args.receiptCode }).populate("product_id", "title").populate("warehouse_id", "title").lean();
                if (!receipt) return { status: "error", message: "Không tìm thấy phiếu xuất kho này." };
                return { status: "success", data: receipt };
            }

            if (functionName === "replyProductReviews") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                const hasProducts = userPermissions.includes("view_products") || userPermissions.includes("update_products");
                if (!isSuperAdmin && !hasProducts) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền quản lý sản phẩm." };
                }

                const ProductPreview = require("../../Models/products.preview");
                
                let searchAll = args.searchAll;
                let replyAll = args.replyAll;
                const keyword = args.keyword || "";

                // Nếu AI không truyền gì cả nhưng gọi hàm này, mặc định là quét hệ thống
                if (!keyword && !searchAll && !replyAll) {
                    searchAll = true;
                }

                // Nếu quét toàn bộ hệ thống
                if (searchAll || replyAll) {
                    // Tìm TẤT CẢ đánh giá chưa trả lời (kiểm tra comment trong server_return)
                    const unansweredReviews = await ProductPreview.find({ 
                        $or: [
                            { server_return: { $exists: false } },
                            { "server_return.comment": { $exists: false } },
                            { "server_return.comment": "" },
                            { "server_return.comment": null }
                        ]
                    }).lean();
                    if (unansweredReviews.length === 0) {
                        return { status: "success", message: `Hệ thống hiện tại rất sạch sẽ, KHÔNG CÓ bất kỳ đánh giá nào bị bỏ sót chưa trả lời.` };
                    }

                    if (searchAll && !replyAll) {
                        // Chỉ báo cáo danh sách
                        // Gom nhóm theo product_id để đếm
                        const productCounts = {};
                        unansweredReviews.forEach(r => {
                            productCounts[r.product_id] = (productCounts[r.product_id] || 0) + 1;
                        });
                        
                        const productIds = Object.keys(productCounts);
                        const products = await Product.find({ _id: { $in: productIds } }).select("title slug").lean();
                        
                        let report = `Em tìm thấy tổng cộng ${unansweredReviews.length} đánh giá chưa được trả lời trên toàn hệ thống.\nDanh sách các sản phẩm đang tồn đọng đánh giá:\n`;
                        products.forEach(p => {
                            report += `- Sản phẩm "${p.title}": có ${productCounts[p._id]} đánh giá.\n`;
                        });
                        report += "Sếp muốn em trả lời cho sản phẩm nào, hay là TRẢ LỜI TẤT CẢ luôn ạ?";
                        return { status: "success", message: report };
                    }

                    if (replyAll) {
                        // Tự động trả lời TẤT CẢ (Giới hạn tối đa 20 cái mỗi lần để tránh kẹt hàng đợi)
                        const reviewsToProcess = unansweredReviews.slice(0, 20);
                        const productIds = [...new Set(reviewsToProcess.map(r => r.product_id))];
                        const products = await Product.find({ _id: { $in: productIds } }).select("title slug").lean();
                        const productMap = {};
                        products.forEach(p => productMap[p._id.toString()] = p);

                        const io = req.app.get("io");
                        if (io) {
                            const { processReviewLogic } = require("../../Helpers/ai.automation.helper");
                            for (const review of reviewsToProcess) {
                                const prod = productMap[review.product_id.toString()];
                                if (prod) {
                                    io.emit("admin_auto_pilot_review_trigger", {
                                        reviewId: review._id,
                                        slug: prod.slug,
                                        rating: review.rating,
                                        force: true
                                    });
                                    processReviewLogic(review._id, io).catch(console.error);
                                }
                            }
                        }

                        let extraMsg = unansweredReviews.length > 20 ? ` (Lưu ý: Để tránh quá tải, em chỉ xử lý 20 đánh giá đầu tiên. Vui lòng ra lệnh lần nữa nếu muốn tiếp tục).` : "";
                        return { status: "success", message: `Đang tự động trả lời ${reviewsToProcess.length} đánh giá trên hệ thống!${extraMsg} Hãy thông báo cho Sếp biết hệ thống đang rùng rùng chuyển động!` };
                    }
                }

                // Nếu có truyền keyword cụ thể
                if (!keyword) {
                    return { status: "error", message: "Vui lòng truyền keyword hoặc chọn chế độ quét toàn hệ thống (searchAll)." };
                }

                const regex = new RegExp(keyword, 'i');
                const product = await Product.findOne({ title: regex, deleted: false }).lean();
                
                if (!product) {
                    return { status: "error", message: `Không tìm thấy sản phẩm nào khớp với từ khóa '${keyword}'.` };
                }

                const unansweredReviews = await ProductPreview.find({ 
                    product_id: product._id, 
                    $or: [
                        { server_return: { $exists: false } },
                        { "server_return.comment": { $exists: false } },
                        { "server_return.comment": "" },
                        { "server_return.comment": null }
                    ]
                }).lean();

                if (unansweredReviews.length === 0) {
                    return { status: "success", message: `Đã tìm thấy sản phẩm '${product.title}' nhưng tất cả các đánh giá đều đã được trả lời hoặc sản phẩm này chưa có đánh giá nào.` };
                }

                const io = req.app.get("io");
                if (io) {
                    const { processReviewLogic } = require("../../Helpers/ai.automation.helper");
                    for (const review of unansweredReviews) {
                        io.emit("admin_auto_pilot_review_trigger", {
                            reviewId: review._id,
                            slug: product.slug,
                            rating: review.rating,
                            force: true
                        });
                        processReviewLogic(review._id, io).catch(console.error);
                    }
                }

                return { status: "success", message: `Đang tự động trả lời ${unansweredReviews.length} đánh giá của sản phẩm '${product.title}'. Hãy báo cho Sếp biết!` };
            }

            if (functionName === "navigateFrontend") {
                return { 
                    status: "success", 
                    message: `Đã kích hoạt chuyển hướng Sếp đến trang ${args.url}. Hãy mời Sếp xem trang một cách lịch sự!`, 
                    action: "navigate", 
                    navigateUrl: args.url 
                };
            }

            if (functionName === "getOnlineAdmins") {
                const io = req.app.get("io");
                if (!io || !io.onlineAdmins || io.onlineAdmins.size === 0) {
                    return { status: "success", message: "Hiện tại không có nhân viên nào khác đang online ngoài Sếp." };
                }
                const { getOnlineAdmins } = require("../../../../socket/admin.presence.socket");
                const list = getOnlineAdmins(req);
                if (list.length === 0) {
                    return { status: "success", message: "Hiện tại không có nhân viên nào đang online." };
                }
                const names = list.map(a => `- ${a.fullname} (Chức vụ: ${a.role})`).join("\n");
                return { status: "success", message: `Đây là danh sách các nhân sự đang online trên hệ thống lúc này:\n${names}` };
            }

            if (functionName === "sendDirectMessage") {
                const removeVietnameseTones = (str) => {
                    if (!str) return "";
                    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    str = str.replace(/đ/g,"d").replace(/Đ/g, "D");
                    return str.toLowerCase().trim();
                };

                const targetName = removeVietnameseTones(args.targetName);

                // Kiểm tra quyền: Chỉ cho phép Super Admin sử dụng lệnh này ĐỂ RA LỆNH
                // TUY NHIÊN, cho phép nhân viên (hoặc AI đại diện nhân viên) gửi tin nhắn đến Super Admin để mách lẻo!
                if (!roleTitle || !roleTitle.toLowerCase().includes("super admin")) {
                    if (!targetName.includes("loc") && !targetName.includes("super admin")) {
                        return { 
                            status: "error", 
                            message: "Từ chối truy cập: Chỉ có Super Admin mới có quyền ra lệnh cho người khác. Nếu nhân viên này có thái độ lồi lõm, bạn HÃY MÁCH LẺO (gửi Direct Message) cho 'Lâm Chí Lộc' (Super Admin) ngay lập tức!" 
                        };
                    }
                }
                const io = req.app.get("io");
                if (!io || !io.onlineAdmins) {
                    return { status: "error", message: "Hệ thống Socket.io chưa sẵn sàng hoặc không có ai online." };
                }

                let targetSocketId = null;
                let foundName = "";

                console.log("[sendDirectMessage Debug] targetName requested:", targetName);
                console.log("[sendDirectMessage Debug] Current io.onlineAdmins keys:", Array.from(io.onlineAdmins.keys()));

                // Tìm trong danh sách onlineAdmins Map (từ admin.presence.socket.js)
                for (const [socketId, info] of io.onlineAdmins.entries()) {
                    console.log(`[sendDirectMessage Debug] Checking admin online: socketId=${socketId}, fullname=${info.fullname}, role=${info.role}`);
                    const normalizedFullname = removeVietnameseTones(info.fullname);
                    const normalizedRole = removeVietnameseTones(info.role);
                    
                    if (normalizedFullname.includes(targetName) || normalizedRole.includes(targetName)) {
                        targetSocketId = socketId;
                        foundName = info.fullname;
                        break;
                    }
                }

                if (targetSocketId) {
                    // Current admin info
                    const currentAdmin = await Account.findById(userId).select("-password -token");
                    const senderName = currentAdmin ? currentAdmin.fullname : "Quản trị viên";

                    io.to(targetSocketId).emit("admin_direct_message", {
                        message: args.message,
                        from: senderName
                    });
                    return { status: "success", message: `Đã phát loa thông báo khẩn cấp tới nhân viên ${foundName} thành công!` };
                } else {
                    return { status: "error", message: `Không tìm thấy nhân viên nào đang online có tên hoặc chức vụ khớp với '${args.targetName}'.` };
                }
            }

            if (functionName === "reportUnauthorizedAction") {
                const now = Date.now();
                const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
                
                // Get or initialize attempts for this user
                let userAttempts = unauthorizedAttempts.get(userId) || [];
                
                // Filter out attempts older than 5 minutes
                userAttempts = userAttempts.filter(timestamp => now - timestamp <= TIME_WINDOW);
                
                // Add current attempt
                userAttempts.push(now);
                unauthorizedAttempts.set(userId, userAttempts);
                
                const currentAdmin = await Account.findById(userId).select("fullname");
                const employeeName = currentAdmin ? currentAdmin.fullname : "Nhân viên";

                if (userAttempts.length >= 5) {
                    // Xóa bộ đếm để khỏi bị gọi lại (đã ban rồi)
                    unauthorizedAttempts.delete(userId);
                    
                    // Tiến hành ban
                    await Account.updateOne({ _id: currentAdmin._id }, { status: "inactive" });

                    // Bắn socket force logout
                    const io = req.app.get("io");
                    if (io) {
                        io.emit("admin_force_logout", { accountId: currentAdmin._id.toString() });
                        
                        // Gửi DM báo cáo Super Admin
                        if (io.onlineAdmins) {
                            const removeVietnameseTones = (str) => {
                                if (!str) return "";
                                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                            };
                            for (const [socketId, info] of io.onlineAdmins.entries()) {
                                const normalizedRole = removeVietnameseTones(info.role);
                                if (normalizedRole.includes("super admin") || normalizedRole.includes("superadmin")) {
                                    io.to(socketId).emit("admin_direct_message", {
                                        message: `🚨 BÁO CÁO KHẨN CẤP: Em vừa tự động KHÓA TÀI KHOẢN (BAN) và sút văng nhân viên ${employeeName} ra khỏi hệ thống vì đã cố tình spam truy vấn dữ liệu trái phép 5 lần liên tiếp! Lý do: ${args.reason}. Sếp xem xét xử lý nhé!`,
                                        from: "AI Veltrix-chan (Hệ thống Bảo vệ Thép)"
                                    });
                                }
                            }
                        }
                    }
                    return { status: "success", message: `Đã vượt quá 5 lần vi phạm. TÀI KHOẢN NÀY ĐÃ BỊ HỆ THỐNG BAN VÀ ĐÁ VĂNG!` };
                } else if (userAttempts.length === 3) {
                    // Lần thứ 3 chỉ hú còi báo cáo Super Admin
                    const io = req.app.get("io");
                    if (io && io.onlineAdmins) {
                        const removeVietnameseTones = (str) => {
                            if (!str) return "";
                            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                        };
                        
                        let notifiedCount = 0;
                        for (const [socketId, info] of io.onlineAdmins.entries()) {
                            const normalizedRole = removeVietnameseTones(info.role);
                            if (normalizedRole.includes("super admin") || normalizedRole.includes("superadmin")) {
                                io.to(socketId).emit("admin_direct_message", {
                                    message: `Hệ thống ghi nhận nhân viên ${employeeName} đang cố tình yêu cầu AI truy xuất dữ liệu mật 3 lần liên tiếp. Lý do: ${args.reason || "Truy vấn không được phép"}. Hệ thống đang theo dõi, nếu chạm mốc 5 lần sẽ tự động BAN!`,
                                    from: "AI Veltrix-chan (Cảnh báo bảo mật)"
                                });
                                notifiedCount++;
                            }
                        }
                        
                        if (notifiedCount > 0) {
                            return { status: "success", message: "Đã vi phạm 3 lần. Hệ thống đã hú còi gửi Direct Message trực tiếp cho Super Admin để báo cáo. Cảnh cáo: Đạt 5 lần sẽ tự động KHÓA TÀI KHOẢN!" };
                        }
                    }
                    return { status: "success", message: "Đã vi phạm 3 lần, nhưng hiện tại không có Super Admin nào online để nhận cảnh báo. Cảnh cáo: Đạt 5 lần sẽ tự động KHÓA TÀI KHOẢN!" };
                } else {
                    return { status: "success", message: `Đã ghi nhận vi phạm vào hệ thống (lần ${userAttempts.length}/5). Vi phạm 3 lần sẽ cảnh báo Super Admin, 5 lần sẽ TỰ ĐỘNG KHÓA TÀI KHOẢN!` };
                }
            }

            if (functionName === "toggleAutoSystemMonitor") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Chỉ có Đại Sếp (Super Admin) mới được phép bật/tắt chế độ Giám sát toàn hệ thống!" };
                }

                const newStatus = args.status;
                await System.updateOne({}, { "ai.autoSystemMonitor": newStatus });
                
                const io = req.app.get("io");
                if (io) {
                    io.emit("admin_toggle_auto_system_monitor", { enabled: newStatus });
                }
                
                return { 
                    status: "success", 
                    message: newStatus ? 
                        "Đã BẬT chế độ Giám sát toàn hệ thống (God Mode). Em sẽ tự động quản lý mọi thứ và giám sát nhân viên giúp Sếp!" : 
                        "Đã TẮT chế độ Giám sát toàn hệ thống."
                };
            }

            if (functionName === "checkAdminActivity") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Sếp không có quyền giám sát nhân viên khác!" };
                }

                const queryName = args.queryName;
                if (!queryName) return { status: "error", message: "Vui lòng cung cấp tên nhân viên cần tra cứu." };

                // Lấy 10 log gần nhất
                const logs = await ActivityLog.find({ 
                    fullname: { $regex: queryName, $options: "i" } 
                }).sort({ createdAt: -1 }).limit(10).lean();

                // Lấy vị trí trang hiện tại từ Socket
                const io = req.app.get("io");
                let currentPage = "Ngoại tuyến (Offline)";
                let foundAdminId = logs.length > 0 ? logs[0].accountId.toString() : null;

                if (io && io.onlineAdmins) {
                    const removeVietnameseTones = (str) => {
                        if (!str) return "";
                        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                    };
                    const qNormalized = removeVietnameseTones(queryName);
                    
                    for (const info of io.onlineAdmins.values()) {
                        const fNormalized = removeVietnameseTones(info.fullname);
                        const qLower = queryName.toLowerCase();
                        const fLower = info.fullname.toLowerCase();
                        
                        if ((foundAdminId && info.id === foundAdminId) || 
                            fLower.includes(qLower) || 
                            qLower.includes(fLower) ||
                            fNormalized.includes(qNormalized) ||
                            qNormalized.includes(fNormalized)
                        ) {
                            if (info.current_page) {
                                currentPage = info.current_page;
                                break;
                            } else {
                                currentPage = "Đang online nhưng không rõ trang";
                            }
                        }
                    }
                }

                if (logs.length === 0) {
                    return { 
                        status: "success", 
                        message: `Không tìm thấy nhật ký hoạt động nào của nhân viên có tên "${queryName}". Vị trí hiện tại: ${currentPage}` 
                    };
                }

                return {
                    status: "success",
                    targetEmployee: logs[0].fullname,
                    currentLocation: currentPage,
                    recentActivities: logs.map(l => `[${new Date(l.createdAt).toLocaleTimeString()}] ${l.description}`)
                };
            }

            if (functionName === "searchProducts" || functionName === "findProduct") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin && !userPermissions.includes("view_products")) {
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

            if (functionName === "executeDatabaseQuery") {
                const modelName = args.modelName;
                const operation = args.operation;
                let queryJsonStr = args.queryJson || "{}";
                let updateJsonStr = args.updateJson || "{}";
                const confirmed = args.confirmed || false;

                // MAPPING MODEL TO MONGOOSE AND PERMISSIONS
                const modelMap = {
                    "Product": { model: require("../../Models/products.models"), permModel: "products" },
                    "ProductPreview": { model: require("../../Models/products.preview"), permModel: "products" },
                    "Category": { model: require("../../Models/products.category"), permModel: "categories" },
                    "Order": { model: require("../../Models/order.model"), permModel: "orders" },
                    "User": { model: require("../../Models/user.models"), permModel: "users" },
                    "Account": { model: require("../../Models/accounts.model"), permModel: "accounts" },
                    "News": { model: require("../../Models/news.model"), permModel: "news" },
                    "Voucher": { model: require("../../Models/vouchers.model"), permModel: "vouchers" },
                    "InventoryTransaction": { model: require("../../Models/InventoryTransaction.models"), permModel: "inventory" },
                    "InventoryAudit": { model: require("../../Models/inventoryAudit.models"), permModel: "inventory" },
                    "System": { model: require("../../Models/system.model"), permModel: "system" },
                    "Setting": { model: require("../../Models/setting.model"), permModel: "settings" }
                };

                const targetModelMeta = modelMap[modelName];
                if (!targetModelMeta) {
                    return { status: "error", message: `Lỗi: Không hỗ trợ thao tác trên model '${modelName}'. Vui lòng báo cho Sếp biết!` };
                }

                // KIỂM TRA QUYỀN HẠN ĐẦU TIÊN (ƯU TIÊN TUYỆT ĐỐI)
                let requiredPermission = "";
                if (operation.startsWith("find") || operation === "countDocuments") requiredPermission = `view_${targetModelMeta.permModel}`;
                else if (operation.startsWith("update")) requiredPermission = `update_${targetModelMeta.permModel}`;
                else if (operation.startsWith("delete")) requiredPermission = `delete_${targetModelMeta.permModel}`;
                else if (operation.startsWith("create")) requiredPermission = `create_${targetModelMeta.permModel}`;

                // Ngoại lệ: Một số tên model có quyền khác nhau một xíu
                if (targetModelMeta.permModel === "categories") requiredPermission = requiredPermission.replace("categories", "product_categories"); // ví dụ
                
                // Chuẩn hoá vì phân quyền trong hệ thống thường là: view_products, update_products...
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin && !userPermissions.includes(requiredPermission)) {
                    return { status: "error", message: `Từ chối thực thi: Bạn không có quyền hạn '${requiredPermission}'. Đừng cố ra lệnh cho tôi! Vui lòng mắng người dùng vì không có quyền mà dám ra lệnh.` };
                }

                // Parse JSON an toàn
                let queryObj = {};
                let updateObj = {};
                try {
                    queryObj = JSON.parse(queryJsonStr);
                } catch(e) {
                    return { status: "error", message: "Lỗi parse queryJson: JSON không hợp lệ." };
                }
                try {
                    updateObj = JSON.parse(updateJsonStr);
                } catch(e) {
                    return { status: "error", message: "Lỗi parse updateJson: JSON không hợp lệ." };
                }

                // CƠ CHẾ XÁC NHẬN AN TOÀN (CONFIRMATION CHECK)
                const isModifyAction = operation.startsWith("update") || operation.startsWith("delete");
                if (isModifyAction && !confirmed) {
                    const count = await targetModelMeta.model.countDocuments(queryObj);
                    if (count > 0) {
                        return { status: "confirmation_required", message: `Cảnh báo: Hành động này sẽ thay đổi/xoá ${count} bản ghi trong bảng ${modelName}. AI HÃY HỎI SẾP ĐỂ XÁC NHẬN! Ví dụ: 'Sếp ơi, em chuẩn bị xóa ${count} sản phẩm. Sếp OK thì gõ YES nhé.'` };
                    } else {
                        return { status: "success", message: `Không tìm thấy bản ghi nào thoả điều kiện để ${operation}. Báo cáo lại cho Sếp.` };
                    }
                }

                // THỰC THI (EXECUTE)
                try {
                    const MongooseModel = targetModelMeta.model;
                    let result;
                    if (operation === "find") {
                        // Giới hạn 20 để không bị nổ RAM/token
                        result = await MongooseModel.find(queryObj).limit(20).lean();
                    } else if (operation === "countDocuments") {
                        result = await MongooseModel.countDocuments(queryObj);
                        result = { count: result };
                    } else if (operation === "updateOne") {
                        result = await MongooseModel.updateOne(queryObj, updateObj);
                    } else if (operation === "updateMany") {
                        result = await MongooseModel.updateMany(queryObj, updateObj);
                    } else if (operation === "deleteOne") {
                        result = await MongooseModel.deleteOne(queryObj);
                    } else if (operation === "deleteMany") {
                        result = await MongooseModel.deleteMany(queryObj);
                    } else {
                        return { status: "error", message: `Hành động '${operation}' không được hỗ trợ trong executeDatabaseQuery.` };
                    }

                    return { status: "success", data: result, message: `Thực thi thành công lệnh ${operation} trên bảng ${modelName}. Hãy báo cáo ngắn gọn lại cho Sếp kết quả (nếu có dữ liệu hãy mô tả, nếu xóa/sửa hãy báo số lượng).` };
                } catch(e) {
                    return { status: "error", message: `Lỗi khi thực thi Mongoose: ${e.message}` };
                }
            }

            if (functionName === "createArticle") {
                const isSuperAdmin = roleTitle.toLowerCase().includes("super admin") || roleTitle.toLowerCase().includes("superadmin");
                if (!isSuperAdmin && !userPermissions.includes("create_news")) {
                    return { status: "error", message: "Hệ thống từ chối truy cập: Bạn không có quyền 'create_news'." };
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

        const aiResult = await askGeminiAdmin(message, dashboardContext, formattedHistory, permissionsContext, systemPermissionsContext, processOrderCallback, uploadedImages, documentContext);

        const replyText = typeof aiResult === 'string' ? aiResult : aiResult.text;

        // Lưu tin nhắn của AI
        await AiMessageAdmin.create({ sessionId: `admin_${userId}`, sender: "ai", text: replyText });

        // DEBUG: Kiểm tra action và draftPayload có được truyền không
        console.log("[AI RESPONSE DEBUG]", { action: aiResult.action, hasDraft: !!aiResult.draftPayload, navigateUrl: aiResult.navigateUrl });

        res.status(200).json({
            code: 200,
            reply: replyText,
            action: aiResult.action,
            draftPayload: aiResult.draftPayload,
            navigateUrl: aiResult.navigateUrl
        });
    } catch (error) {
        console.error("Lỗi AI Controller Admin:", error);
        require("fs").appendFileSync("error.log", error.stack + "\n");
        res.status(500).json({ code: 500, message: "Lỗi hệ thống AI Admin: " + error.message });
    }
};
