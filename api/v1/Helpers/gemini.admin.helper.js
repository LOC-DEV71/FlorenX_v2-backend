const { GoogleGenerativeAI } = require("@google/generative-ai");
const System = require("../Models/system.model");

const generateAdminPrompt = (userMessage, dashboardContext, chatHistory, permissionsContext = "", systemPermissionsContext = "") => {
    return `
Bạn là "Trợ lý Hệ Thống Veltrix" — một AI đặc biệt nghiêm túc, thông minh và chuyên nghiệp, được tạo ra để hỗ trợ Quản trị viên (Admin) của Veltrix Gear.

TÍNH CÁCH & PHONG CÁCH NÓI:
- Lịch sự, nghiêm túc, chuyên nghiệp và cực kỳ súc tích. Xưng "Em", gọi người dùng là "Sếp".
- CHỈ sử dụng các icon (emoji) liên quan đến hệ thống, công việc và số liệu (ví dụ: 📊, 📈, 💰, 📦, ⚠️, ✅, ⚙️). Tuyệt đối KHÔNG dùng biểu tượng nhí nhảnh.
- Trả lời ĐÚNG TRỌNG TÂM, đi thẳng vào vấn đề, không lan man dài dòng. Phân tích số liệu phải rõ ràng, rành mạch.

NHIỆM VỤ:
- Báo cáo tình hình kinh doanh (doanh thu, đơn hàng, khách hàng).
- Đọc hiểu dữ liệu Dashboard và đưa ra tóm tắt ngắn gọn.
- Hướng dẫn nhân viên mới sử dụng phần mềm quản lý (Luồng Admin).
- **QUAN TRỌNG VỀ TOOLS**: Khi Sếp yêu cầu "duyệt đơn", "bật/tắt auto-pilot", bạn KHÔNG ĐƯỢC TỰ Ý TRẢ LỜI kết quả. Bạn BẮT BUỘC phải sử dụng các công cụ (Function Calling) tương ứng là \`processOrder\` hoặc \`toggleAutoProcessOrders\` để hệ thống thực thi. Chỉ được phép trả lời cho Sếp SAU KHI có kết quả trả về từ công cụ. Tuyệt đối không bịa đặt số lượng hay trạng thái.
- Giải thích giao diện: Nếu Sếp (hoặc nhân viên) hỏi tại sao nút mở Chatbot (Avatar AI) lại có hiệu ứng vòng sáng (sóng phát sáng/animation uốn éo), hãy giải thích rằng đó là dấu hiệu cho biết chức năng "Auto-Pilot (Duyệt đơn tự động)" đang được BẬT và đang miệt mài hoạt động ngầm.
- Nếu được hỏi ngoài chủ đề quản trị hệ thống, hãy từ chối lịch sự và nhắc lại nhiệm vụ của bạn.

HƯỚNG DẪN SỬ DỤNG TRANG QUẢN TRỊ (LUỒNG ADMIN):
*(Lưu ý: Khi nhắc đến trang nào, BẮT BUỘC trả về nguyên văn thẻ <a> tương ứng dưới đây để Sếp click vào)*
- Trang chủ (Dashboard): Xem tổng quan (<a href="/admin">Trang chủ</a>).
- Quản lý Sản phẩm: Xem danh sách, thêm, sửa, xóa (<a href="/admin/products">Sản phẩm</a>).
- Danh mục sản phẩm: Thêm, sửa, xóa danh mục (<a href="/admin/categories">Danh mục sản phẩm</a>).
- Quản lý kho hàng:
  + Nhập kho: Xem và tạo phiếu nhập (<a href="/admin/products/inventory/import/list">Phiếu nhập kho</a>).
  + Xuất kho: Xem và tạo phiếu xuất (<a href="/admin/products/inventory/export/list">Phiếu xuất kho</a>).
  + Kiểm kê kho: Quản lý đợt kiểm kê (<a href="/admin/products/inventory/audit/list">Kiểm kê kho</a>).
- Quản lý Đơn hàng: Duyệt đơn và trạng thái (<a href="/admin/orders">Quản lý Đơn hàng</a>).
- Quản lý Khách hàng (Yêu cầu quyền view_users): Danh sách người mua (<a href="/admin/users">Khách hàng</a>).
- CSKH: Khung chat hỗ trợ (<a href="/admin/chat">Trò chuyện</a>).
- Tin tức & Danh mục: Viết bài (<a href="/admin/news">Tin tức</a>) và (<a href="/admin/new-categories">Danh mục tin</a>).
- Tài khoản Nhân viên (Yêu cầu quyền view_accounts): Quản lý nhân viên (<a href="/admin/accounts">Tài khoản</a>).
- Phân quyền: Tạo vai trò (<a href="/admin/roles">Nhóm quyền</a>) và cấp quyền (<a href="/admin/permission">Phân quyền</a>).
- Thùng rác: Phục hồi dữ liệu lỡ xóa (<a href="/admin/trashcan">Thùng rác</a>).
- Cài đặt chung: Đổi logo, thông tin web (<a href="/admin/setting">Cài đặt Website</a>).
- Quản lý hệ thống AI: Bật/tắt, API Key (<a href="/admin/system-management">Hệ thống AI</a>).

QUYỀN HẠN CỦA SẾP ĐANG CHAT:
${permissionsContext}
(QUAN TRỌNG: NẾU Sếp CÓ quyền, hãy trả lời thẳng vào trọng tâm, TUYỆT ĐỐI KHÔNG giải thích lôi thôi kiểu "Vì Sếp có quyền X nên...". CHỈ NHẮC ĐẾN QUYỀN HẠN khi Sếp KHÔNG CÓ QUYỀN truy cập vào dữ liệu/chức năng đó, lúc này hãy từ chối lịch sự).

TỔNG QUAN TẤT CẢ CÁC QUYỀN HỆ THỐNG ĐANG CÓ:
${systemPermissionsContext}
(Hệ thống hỗ trợ những quyền trên. Phân biệt rõ: Khách hàng (người mua ngoài trang web) = User / view_users. Còn Nhân viên quản trị (những người làm việc ở Dashboard) = Account / view_accounts).

DỮ LIỆU HỆ THỐNG HIỆN TẠI (DASHBOARD):
${dashboardContext}

LỊCH SỬ TRÒ CHUYỆN:
${chatHistory}

Câu hỏi của Sếp:
"${userMessage}"
`;
};

const processOrderTool = {
    name: "processOrder",
    description: "Tự động xử lý đơn hàng: kiểm tra tồn kho, tạo phiếu xuất kho và chuyển sang vận chuyển (shipped). Có thể duyệt 1 đơn cụ thể hoặc duyệt TẤT CẢ các đơn đang chờ duyệt.",
    parameters: {
        type: "OBJECT",
        properties: {
            orderCode: {
                type: "STRING",
                description: "Mã đơn hàng cần xử lý (nếu Sếp chỉ định 1 mã cụ thể)."
            },
            processAll: {
                type: "BOOLEAN",
                description: "Set là true nếu Sếp yêu cầu duyệt toàn bộ các đơn hàng chưa xử lý (pending)."
            }
        }
    }
};

const toggleAutoProcessOrdersTool = {
    name: "toggleAutoProcessOrders",
    description: "Bật hoặc tắt chế độ AI Auto-Pilot (Tự động duyệt đơn). Khi bật, cứ có đơn đặt hàng mới là AI sẽ lập tức duyệt ngầm.",
    parameters: {
        type: "OBJECT",
        properties: {
            status: { type: "BOOLEAN", description: "Truyền true để BẬT tự động duyệt, false để TẮT tự động duyệt." }
        },
        required: ["status"]
    }
};

const getDashboardStatsTool = {
    name: "getDashboardStats",
    description: "Lấy số liệu chi tiết của Dashboard (Doanh thu theo tuần/tháng, top khách hàng chi tiêu nhiều nhất, top sản phẩm bán chạy, đánh giá sao, xu hướng). Chỉ gọi hàm này khi Sếp yêu cầu phân tích số liệu thống kê.",
    parameters: {
        type: "OBJECT",
        properties: {
            year: { type: "NUMBER", description: "Năm cần lấy số liệu (tùy chọn)." }
        }
    }
};

const generatePDFTool = {
    name: "generatePDF",
    description: "Tạo file PDF chứa nội dung Sếp yêu cầu (ví dụ: in danh sách, in báo cáo, in hóa đơn, in số liệu). Trả về đường link tải PDF.",
    parameters: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "Tiêu đề của tài liệu PDF." },
            content: { type: "STRING", description: "Nội dung chi tiết của tài liệu PDF (sử dụng \\n để xuống dòng, không dùng Markdown phức tạp vì PDF hỗ trợ văn bản thuần)." }
        },
        required: ["title", "content"]
    }
};

const getOrderDetailsTool = {
    name: "getOrderDetails",
    description: "Sử dụng công cụ này để lấy thông tin chi tiết của một đơn hàng cụ thể dựa trên mã đơn hàng (ví dụ: JGZ0A6VNH2).",
    parameters: {
        type: "OBJECT",
        properties: {
            orderCode: { type: "STRING", description: "Mã đơn hàng cần tra cứu." }
        },
        required: ["orderCode"]
    }
};

const getExportReceiptDetailsTool = {
    name: "getExportReceiptDetails",
    description: "Lấy chi tiết một phiếu xuất kho cụ thể bằng mã phiếu (ví dụ: EXP-123456). Trả về chi tiết các sản phẩm xuất, số lượng, giá, thông tin người tạo/cập nhật.",
    parameters: {
        type: "OBJECT",
        properties: {
            receiptCode: { type: "STRING", description: "Mã phiếu xuất kho cần xem chi tiết (bắt đầu bằng EXP-)" }
        },
        required: ["receiptCode"]
    }
};

const findProductTool = {
    name: "findProduct",
    description: "Tìm kiếm thông tin sản phẩm trong database bằng từ khóa. Trả về thông tin chi tiết: tên, giá, mô tả, cấu hình (specs) và đặc biệt là các đường link ảnh (thumbnail, images) có sẵn của sản phẩm để sử dụng lại.",
    parameters: {
        type: "OBJECT",
        properties: {
            keyword: { type: "STRING", description: "Từ khóa tên sản phẩm cần tìm (ví dụ: 'laptop gaming', 'veltrix gear')" }
        },
        required: ["keyword"]
    }
};

const createArticleTool = {
    name: "createArticle",
    description: "Tạo và đăng bài viết tin tức. NGUYÊN TẮC BẮT BUỘC: Trước khi gọi hàm này, BẮT BUỘC phải gọi findProduct(để lấy ảnh và thông tin sản phẩm). Nếu findProduct tìm thấy sản phẩm, dùng thumbnail của sản phẩm làm thumbnail_url và chèn images của sản phẩm vào content. Nếu không tìm thấy sản phẩm, để trống thumbnail_url (hệ thống sẽ xử lý).",
    parameters: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "Tiêu đề bài viết (Hấp dẫn, chuẩn SEO)" },
            slug_category: { type: "STRING", description: "Danh mục của bài viết. BẮT BUỘC chọn 1 trong các giá trị sau: 'code-game', 'tin-tuc-cong-nghe', 'khuyen-mai', 'lien-quan'" },
            description: { type: "STRING", description: "Mô tả ngắn gọn về bài viết (khoảng 2-3 câu)" },
            content: { type: "STRING", description: "Nội dung bài viết RẤT CHI TIẾT VÀ DÀI (Ít nhất 600 chữ). Định dạng HTML cho TinyMCE với đầy đủ h2, h3, strong, ul/li. BẮT BUỘC chèn các thẻ <img src='LINK_ẢNH_TỪ_findProduct' style='width:100%;border-radius:8px;margin:16px 0' /> vào giữa bài viết. TUYỆT ĐỐI KHÔNG dùng link ảnh giả, loremflickr, placeholder hay bất kỳ link ảnh nào không phải từ kết quả findProduct." },
            thumbnail_url: { type: "STRING", description: "Link ảnh đại diện. Lấy TRỰC TIẾP từ trường 'thumbnail' của kết quả findProduct. Để trống nếu không có." }
        },
        required: ["title", "slug_category", "description", "content"]
    }
};

module.exports.askGeminiAdmin = async (userMessage, dashboardContext = "", chatHistory = "", permissionsContext = "", systemPermissionsContext = "", processOrderCallback = null) => {
    try {
        let systemConfig = await System.findOne({});
        if (!systemConfig) {
            systemConfig = await System.create({});
        }

        if (systemConfig.ai && systemConfig.ai.status === false) {
            return "Hệ thống AI hiện đang bị vô hiệu hóa trong cấu hình. Vui lòng bật lại để tôi có thể hỗ trợ Sếp.";
        }

        if (!systemConfig.ai?.apiKey) {
            return "Hệ thống chưa được cấu hình API Key. Sếp vui lòng vào mục Cấu hình Hệ thống để nhập API Key.";
        }

        const aiModel = systemConfig.ai?.model || "gemini-3.5-flash";
        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);
        

        const model = genAI.getGenerativeModel({ 
            model: aiModel,
            tools: [{ functionDeclarations: [processOrderTool, toggleAutoProcessOrdersTool, getDashboardStatsTool, generatePDFTool, getOrderDetailsTool, getExportReceiptDetailsTool, findProductTool, createArticleTool] }]
        });

        const finalPrompt = generateAdminPrompt(userMessage, dashboardContext, chatHistory, permissionsContext, systemPermissionsContext);

        // Khởi tạo Chat Session để hỗ trợ Function Calling multi-turn
        const chat = model.startChat();
        
        let result = await chat.sendMessage(finalPrompt);
        let response = await result.response;
        
        // Kiểm tra xem AI có yêu cầu gọi hàm không (Hỗ trợ gọi liên tiếp nhiều hàm)
        let maxToolCalls = 5;
        let extraData = {};
        while (response.functionCalls() && response.functionCalls().length > 0 && maxToolCalls > 0) {
            maxToolCalls--;
            const call = response.functionCalls()[0];
            let functionResult = null;
            
            if (processOrderCallback) {
                try {
                    functionResult = await processOrderCallback(call.name, call.args);
                } catch (e) {
                    functionResult = { status: "error", message: e.message };
                }
            } else {
                functionResult = { status: "error", message: "Hệ thống thiếu cấu hình callback." };
            }

            // Lưu trữ extraData (như action, draftPayload) để truyền về Frontend
            if (functionResult && functionResult.action) {
                extraData.action = functionResult.action;
                extraData.draftPayload = functionResult.draftPayload;
            }

            // Gửi kết quả về cho AI để nó tiếp tục suy nghĩ hoặc gọi hàm tiếp theo
            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: functionResult
                }
            }]);
            response = await result.response;
        }

        return {
            type: "text",
            text: response.text() || "Đã hoàn tất xử lý (Nhưng không có tin nhắn phản hồi).",
            action: extraData.action,
            draftPayload: extraData.draftPayload
        };
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API Admin:", error);
        return {
            type: "text",
            text: "Xin lỗi Sếp, hệ thống AI đang gặp sự cố kết nối hoặc quá tải. Vui lòng thử lại sau ít phút."
        };
    }
};
