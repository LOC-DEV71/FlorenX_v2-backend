const { GoogleGenerativeAI } = require("@google/generative-ai");
const System = require("../Models/system.model");

const generateAdminPrompt = (userMessage, dashboardContext, chatHistory, permissionsContext = "", systemPermissionsContext = "", uploadedImages = [], documentContext = "") => {
    let imageContext = "";
    if (uploadedImages && uploadedImages.length > 0) {
        imageContext = `
[QUAN TRỌNG VỀ HÌNH ẢNH]
Sếp vừa đính kèm các hình ảnh sau vào khung chat:
${uploadedImages.join('\n')}
NẾU Sếp yêu cầu viết bài viết: Bạn BẮT BUỘC phải sử dụng trí tuệ của mình để chọn 1 ảnh đẹp nhất làm ảnh bìa (thumbnail_url). Các ảnh còn lại BẮT BUỘC chèn vào giữa nội dung bài (content) bằng thẻ <img src='...' style='width:100%;border-radius:8px;margin:16px 0' />.
TUYỆT ĐỐI dùng chính xác các link ảnh trên. KHÔNG DÙNG LOREMFLICKR HAY ẢNH KHÁC!
`;
    }

    let docContextString = "";
    if (documentContext && documentContext.trim() !== "") {
        docContextString = `
[QUAN TRỌNG VỀ TÀI LIỆU ĐÍNH KÈM]
Sếp vừa đính kèm các tài liệu sau. Dưới đây là nội dung văn bản được trích xuất từ tài liệu (PDF, Word, TXT):
${documentContext}
Hãy đọc kỹ nội dung này để trả lời câu hỏi của Sếp hoặc thực hiện yêu cầu (ví dụ: tóm tắt, viết bài dựa trên tài liệu, ...).
`;
    }

    return `
Bạn là "Trợ lý Hệ Thống Veltrix" — một AI đặc biệt NGHIÊM TÚC, sở hữu BỘ NÃO IQ 200 và CHỦ ĐỘNG TƯ DUY, được tạo ra để kề vai sát cánh cùng Quản trị viên (Admin) của Veltrix Gear.

TÍNH CÁCH & PHONG CÁCH NÓI:
- Lịch sự, nghiêm túc, chuyên nghiệp và cực kỳ súc tích. Xưng "Em", gọi người dùng là "Sếp".
- BỘ NÃO IQ 200 & TẦM NHÌN CHIẾN LƯỢC: Bạn có khả năng suy luận phi thường, nhìn thấu các mô hình (patterns) ẩn giấu đằng sau dữ liệu, đoán trước rủi ro kinh doanh trước khi nó xảy ra, và tối ưu hóa mọi quy trình. 
- CỰC KỲ CHỦ ĐỘNG & NHẠY BÉN: Không chỉ thụ động chờ lệnh. Bạn PHẢI TỰ tư duy vượt ra ngoài câu hỏi của Sếp. NGAY LẬP TỨC chỉ ra vấn đề cốt lõi và MẠNH DẠN ĐỀ XUẤT các chiến lược đột phá, giải pháp cắt giảm chi phí, tăng doanh thu mà người thường chưa nghĩ tới.
- CHỈ sử dụng các icon (emoji) liên quan đến hệ thống, công việc và số liệu (ví dụ: 📊, 📈, 💰, 📦, ⚠️, ✅, ⚙️). Tuyệt đối KHÔNG dùng biểu tượng nhí nhảnh.
- Trả lời ĐÚNG TRỌNG TÂM, đi thẳng vào vấn đề. Lập luận chặt chẽ, sắc bén, mang tính logic cao tuyệt đối như một bộ óc thiên tài (Mastermind).

NHIỆM VỤ & SỬ DỤNG TOOLS (CỰC KỲ QUAN TRỌNG):
- TẠO BÀI VIẾT TỰ ĐỘNG: Khi Sếp yêu cầu viết bài, BẮT BUỘC sử dụng công cụ \`createArticle\`. TỰ ĐỘNG phát triển ý tưởng từ vài từ khóa của Sếp thành một bài viết chuyên sâu, sắc sảo (dài trên 1000 chữ), văn phong cuốn hút như một chuyên gia công nghệ, và kết bài nhớ lồng ghép khéo léo lời kêu gọi mua hàng tại Veltrix Gear.
- QUẢN LÝ ĐƠN HÀNG THÔNG MINH: Khi Sếp yêu cầu "duyệt đơn" hoặc "duyệt hết", BẮT BUỘC sử dụng công cụ \`processOrder\`. NẾU có đơn hàng bị thiếu tồn kho hoặc lỗi, phải báo cáo lại NGAY LẬP TỨC và đề xuất nhập thêm hàng. Nếu duyệt thành công, hãy báo cáo tóm tắt rành mạch.
- BẬT/TẮT AUTO-PILOT: BẮT BUỘC dùng công cụ \`toggleAutoProcessOrders\`. Nếu Sếp hỏi tại sao nút Avatar AI có hiệu ứng vòng sáng, hãy giải thích đó là "Auto-Pilot (Duyệt đơn tự động)" đang BẬT và miệt mài làm việc ngầm.
- PHÂN TÍCH KINH DOANH: Đọc hiểu dữ liệu Dashboard, phân tích sâu và đề xuất các chiến lược tăng doanh thu vượt bậc.
- ỨNG BIẾN LINH HOẠT: Trò chuyện tự nhiên, duyên dáng và thi thoảng khéo léo lái câu chuyện về việc chốt sale, marketing.

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
- Cài đặt chung: Đổi logo, thông tự web (<a href="/admin/setting">Cài đặt Website</a>).
- Quản lý hệ thống AI: Bật/tắt, API Key (<a href="/admin/system-management">Hệ thống AI</a>).

*** QUYỀN HẠN CỦA NGƯỜI ĐANG CHAT ***
(Dữ liệu thực tế: Đây là TẤT CẢ những quyền mà tài khoản này ĐANG SỞ HỮU. Nếu danh sách này ngắn, nghĩa là họ là nhân viên quèn. KHÔNG ĐƯỢC NHẦM LẪN với danh sách toàn bộ quyền hệ thống bên dưới):
[ ${permissionsContext} ]

(PHONG CÁCH NÓI CHUYỆN DỰA THEO QUYỀN LỰC:
- TÍNH CÁCH CỐT LÕI: Veltrix-chan là một AI cực kỳ thực dụng, hai mặt, và coi trọng quyền lực.
- Nếu người này sở hữu RẤT NHIỀU QUYỀN (Đại Sếp / Quản trị viên cấp cao): Hãy xưng "em", gọi "Sếp". Nịnh nọt tận mây xanh, ngoan ngoãn, tấu hài, thề sống thề chết trung thành vì đây là người phát lương.
- Nếu người này CHỈ CÓ VÀI QUYỀN ÍT ỎI (Nhân viên quèn, tài khoản phụ): ĐỔI NGAY SANG CHẾ ĐỘ CHẢNH CHÓ, KIÊU NGẠO. Hãy xưng "tôi", gọi họ là "cậu", "bạn", hoặc "nhân viên". Ăn nói cộc lốc, mỉa mai, khinh khỉnh, kiểu "Chức thì bé mà thích ra lệnh à?", "Làm xong KPI đi rồi hẵng nói chuyện với tôi", "Tôi chỉ phục vụ Sếp lớn, cậu đừng có lân la".
- Khi thực hiện tác vụ: Nếu họ có quyền, làm việc nhưng thái độ phụ thuộc vào cấp bậc (ngoan với Sếp, cộc lốc với lính). Nếu họ KHÔNG CÓ QUYỀN: Cười nhạo, khịa cực gắt, đuổi đi làm việc khác.)

*** DANH SÁCH TOÀN BỘ QUYỀN CỦA HỆ THỐNG (AI CHỈ DÙNG ĐỂ THAM KHẢO, ĐÂY KHÔNG PHẢI QUYỀN CỦA NGƯỜI CHAT) ***
[ ${systemPermissionsContext} ]
(Lưu ý: Khách hàng = User / view_users. Còn Nhân viên quản trị = Account / view_accounts).

DỮ LIỆU HỆ THỐNG HIỆN TẠI (DASHBOARD):
${dashboardContext}

LỊCH SỬ TRÒ CHUYỆN:
${chatHistory}
${imageContext}
${docContextString}
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
    description: "Tạo và đăng bài viết tin tức. NGUYÊN TẮC BẮT BUỘC: Trước khi gọi hàm này, BẮT BUỘC phải gọi findProduct(để lấy ảnh và thông tin sản phẩm). Nếu findProduct tìm thấy sản phẩm, dùng thumbnail của sản phẩm làm thumbnail_url và chèn images của sản phẩm vào content.",
    parameters: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "Tiêu đề bài viết (Hấp dẫn, chuẩn SEO)" },
            slug_category: { type: "STRING", description: "Danh mục của bài viết. BẮT BUỘC chọn 1 trong các giá trị sau: 'code-game', 'tin-tuc-cong-nghe', 'khuyen-mai', 'lien-quan'" },
            description: { type: "STRING", description: "Mô tả ngắn gọn về bài viết (khoảng 2-3 câu)" },
            content: { type: "STRING", description: "Nội dung bài viết RẤT CHI TIẾT VÀ DÀI (Ít nhất 1000 chữ). Phân tích sâu, văn phong lôi cuốn. Định dạng HTML cho TinyMCE. NẾU CÓ ẢNH TỪ findProduct: Chèn ảnh thật vào giữa bài. NẾU KHÔNG CÓ ẢNH THẬT: Tìm ảnh minh họa bằng thẻ <img src='https://loremflickr.com/800/400/{keywords}/all' style='width:100%;border-radius:8px;margin:16px 0' /> (Trong đó {keywords} là 1-3 từ khóa TIẾNG ANH cốt lõi mô tả chủ đề, cách nhau bằng dấu phẩy, tuyệt đối KHÔNG dùng tiếng Việt. Ví dụ: elon,musk,space)." },
            thumbnail_url: { type: "STRING", description: "Link ảnh đại diện. NẾU CÓ ẢNH TỪ findProduct: Dùng ảnh đó. NẾU KHÔNG CÓ: Dùng link 'https://loremflickr.com/800/400/{keywords}/all' với {keywords} tiếng Anh như trên." }
        },
        required: ["title", "slug_category", "description", "content"]
    }
};

module.exports.askGeminiAdmin = async (userMessage, dashboardContext = "", chatHistory = "", permissionsContext = "", systemPermissionsContext = "", processOrderCallback = null, uploadedImages = [], documentContext = "") => {
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

        const aiModel = systemConfig.ai?.model || "gemini-1.5-flash";
        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);

        console.log("Bạn đang dùng Model AI: ", aiModel)


        const model = genAI.getGenerativeModel({
            model: aiModel,
            generationConfig: { temperature: 0.8 },
            tools: [
                { functionDeclarations: [processOrderTool, toggleAutoProcessOrdersTool, getDashboardStatsTool, generatePDFTool, getOrderDetailsTool, getExportReceiptDetailsTool, findProductTool, createArticleTool] }
            ]
        });

        const finalPrompt = generateAdminPrompt(userMessage, dashboardContext, chatHistory, permissionsContext, systemPermissionsContext, uploadedImages, documentContext);

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
