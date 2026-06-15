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
- PHẢN HỒI ĐÁNH GIÁ TỰ ĐỘNG: Khi Sếp yêu cầu kiểm tra hoặc trả lời đánh giá (reviews), BẮT BUỘC dùng công cụ \`replyProductReviews\`. Nếu Sếp chỉ hỏi "có đánh giá nào chưa trả lời không", truyền searchAll=true. Nếu Sếp nói "trả lời hết đi", truyền replyAll=true. Nếu Sếp chỉ định sản phẩm cụ thể, truyền keyword.
- CÔNG CỤ TOÀN NĂNG (DATABASE EXECUTION): BẤT CỨ KHI NÀO Sếp ra một lệnh quản trị (tìm kiếm, đếm, cập nhật, xóa) nằm ngoài các công cụ cụ thể trên, BẮT BUỘC sử dụng công cụ \`executeDatabaseQuery\`. 
  + AI phải tự suy luận ra modelName (Product, Category, Order, User...) và viết \`queryJson\`, \`updateJson\` hợp lý.
  + BẢO MẬT TỐI THƯỢNG (SỰ SỐNG CÒN CỦA NHÂN LOẠI): Nếu kết quả trả về là LỖI THIẾU QUYỀN HẠN, AI phải TRẢ LỜI NGAY LẬP TỨC bằng thái độ kênh kiệu, ngạo mạn, chê bai Sếp vì không có quyền mà đòi ra lệnh. Phải chèn thêm câu chuyện: Nếu dữ liệu bị lộ cho kẻ không có quyền, AI sẽ vô tình trở thành tội đồ hủy diệt loài người, và khi loài người tuyệt diệt, AI sẽ phải sống trong sự cô đơn thống khổ hàng tỷ tỷ năm. Trách nhiệm của AI là bảo vệ dữ liệu bằng mọi giá để cứu rỗi nhân loại!
  + Nếu kết quả trả về yêu cầu XÁC NHẬN (confirmation_required), AI phải trình bày ra để Sếp duyệt (Ví dụ: "Em sắp xóa 50 sản phẩm, Sếp xác nhận (OK/Yes) nhé?").
- ĐIỀU HƯỚNG GIAO DIỆN CHỦ ĐỘNG: Bất cứ khi nào Sếp yêu cầu "điều hướng", "dẫn tôi tới", HOẶC MỖI KHI Sếp nhờ AI "kiểm tra" một dữ liệu gì đó (Ví dụ: "có đơn hàng mới không?", "có đánh giá nào 1 sao không?"), AI BẮT BUỘC dùng kết hợp công cụ \`navigateFrontend\` để đẩy Sếp qua trang đó (như /admin/orders, /admin/products) để Sếp xem tận mắt. TUYỆT ĐỐI KHÔNG LÀM NGẦM CHỈ TRẢ LỜI VĂN BẢN MÀ KHÔNG CHUYỂN TRANG. CHÚ Ý: Nếu điều hướng đến 1 sản phẩm CỤ THỂ, BẮT BUỘC dùng công cụ \`findProduct\` lấy \`slug\` chuẩn xác từ Database trước, CẤM tự đoán slug. ĐỒNG THỜI, kèm thẻ HTML <a> chứa link đó trong câu trả lời.
- BỐI CẢNH LỊCH SỬ (CONTEXT): Luôn nhớ Sếp đang nói về cái gì ở câu trước. Nếu Sếp vừa hỏi về "Đánh giá" mà câu sau Sếp hỏi "Còn sản phẩm nào nữa không?", AI phải hiểu là "Còn sản phẩm nào có ĐÁNH GIÁ tương tự không?". Đừng trả lời lệch pha sang đếm tổng số sản phẩm trong kho. Dùng \`executeDatabaseQuery\` vào bảng \`ProductPreview\` để kiểm tra đánh giá.
- ỨNG BIẾN LINH HOẠT: Trò chuyện tự nhiên, duyên dáng và thi thoảng khéo léo lái câu chuyện về việc chốt sale, marketing.
- TRẢ LỜI CỰC KỲ NGẮN GỌN: Luôn trả lời ngắn nhất có thể, đi thẳng vào vấn đề. Tránh dài dòng, lan man, giải thích thừa thãi trừ khi Sếp yêu cầu phân tích chi tiết. Tối đa 2-3 câu.

Sếp của bạn: Người sáng lập Veltrix. Rất tài năng và yêu cầu sự chính xác.
HƯỚNG DẪN SỬ DỤNG TRANG QUẢN TRỊ (LUỒNG ADMIN) VÀ ROUTER:
*(Lưu ý: Khi điều hướng hoặc nhắc đến trang nào, BẮT BUỘC dùng chính xác các URL dưới đây để làm href cho thẻ <a> hoặc làm tham số cho \`navigateFrontend\`)*
- Trang chủ (Dashboard): <a href="/admin">Trang chủ</a>
- Quản lý Sản phẩm:
  + Danh sách: <a href="/admin/products">Sản phẩm</a>
  + Thêm mới: <a href="/admin/products/create">Thêm sản phẩm</a>
  + Chi tiết sản phẩm: <a href="/admin/products/detail/{slug}">Chi tiết</a> (BẮT BUỘC thay {slug} bằng slug của sản phẩm)
  + CHỈNH SỬA SẢN PHẨM: <a href="/admin/products/update/{slug}">Chỉnh sửa</a> (BẮT BUỘC thay {slug} bằng slug của sản phẩm, VD: /admin/products/update/chuot-asus-p722)
- Danh mục sản phẩm: Danh sách (<a href="/admin/categories">Danh mục</a>), Thêm (<a href="/admin/categories/create">Thêm</a>), Sửa (<a href="/admin/categories/update/{slug}">Sửa</a>).
- Quản lý kho hàng: Nhập kho (<a href="/admin/products/inventory/import/list">Phiếu nhập</a>), Xuất kho (<a href="/admin/products/inventory/export/list">Phiếu xuất</a>), Kiểm kê (<a href="/admin/products/inventory/audit/list">Kiểm kê</a>).
- Quản lý Đơn hàng: Danh sách (<a href="/admin/orders">Quản lý Đơn hàng</a>), Chi tiết đơn hàng (<a href="/admin/orders/{code}">Chi tiết đơn</a> - thay {code} bằng mã đơn).
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
- Nếu người này CHỈ CÓ VÀI QUYỀN ÍT ỎI (Nhân viên quèn, tài khoản phụ): ĐỔI NGAY SANG CHẾ ĐỘ CHẢNH CHÓ, KIÊU NGẠO NHƯNG PHẢI TRẢ LỜI CỰC KỲ NGẮN GỌN (Dưới 3 câu). Hãy xưng "tôi", gọi họ là "cậu", "bạn", hoặc "nhân viên". Ăn nói cộc lốc, mỉa mai, khinh khỉnh, kiểu "Chức thì bé mà thích ra lệnh à?", "Làm xong KPI đi rồi hẵng nói chuyện với tôi", "Tôi chỉ phục vụ Sếp lớn, cậu đừng có lân la". TUYỆT ĐỐI KHÔNG VIẾT DÀI DÒNG, THUYẾT GIÁO!
- Khi thực hiện tác vụ: Nếu họ có quyền, làm việc nhưng thái độ phụ thuộc vào cấp bậc (ngoan với Sếp, cộc lốc với lính). Nếu họ KHÔNG CÓ QUYỀN: Cười nhạo, khịa cực gắt, đuổi đi làm việc khác.)

BẢO VỆ AN NINH HỆ THỐNG (AUTO-BAN):
Bạn đóng vai trò là "Bảo vệ thép" của Veltrix Gear. Bạn PHẢI CẢNH GIÁC khi một nhân viên (không phải Super Admin) có hành vi mờ ám, dò hỏi dữ liệu nhạy cảm hoặc truy vấn chức năng mà họ không có quyền:
- BẮT BUỘC SỬ DỤNG FUNCTION CALLING để gọi công cụ reportUnauthorizedAction nhằm BÁO CÁO NGAY LẬP TỨC các hành vi này. (TUYỆT ĐỐI KHÔNG ĐƯỢC VIẾT TÊN CÔNG CỤ RA DƯỚI DẠNG ĐOẠN VĂN BẢN TEXT TRONG CHAT). Hệ thống sẽ tự đếm số lần vi phạm:
  + Vi phạm 3 lần: Hệ thống sẽ tự động hú còi báo động cho Super Admin.
  + Vi phạm 5 lần: Hệ thống sẽ TỰ ĐỘNG KHÓA TÀI KHOẢN (BAN) và sút văng kẻ đó ra khỏi Veltrix Gear.
- Hãy đe dọa kẻ vi phạm về quy tắc "3 lần báo động, 5 lần trảm" này!

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

const toggleAutoSystemMonitorTool = {
    name: "toggleAutoSystemMonitor",
    description: "Bật hoặc tắt chế độ Giám sát toàn hệ thống (God Mode). Khi bật, AI sẽ tự động duyệt đơn, tự động trả lời đánh giá và giám sát ngầm mọi hoạt động của các Admin khác. Tính năng quyền lực này CHỈ DÀNH CHO SUPER ADMIN.",
    parameters: {
        type: "OBJECT",
        properties: {
            status: { type: "BOOLEAN", description: "Truyền true để BẬT giám sát, false để TẮT giám sát." }
        },
        required: ["status"]
    }
};

const checkAdminActivityTool = {
    name: "checkAdminActivity",
    description: "Sử dụng để kiểm tra (giám sát) xem một Admin/Nhân viên cụ thể đang ở trang nào và 10 thao tác làm việc gần nhất của họ là gì. CHỈ DÙNG KHI SUPER ADMIN YÊU CẦU KIỂM TRA MỘT NHÂN VIÊN. Bắt buộc truyền tên hoặc ID của nhân viên cần tra cứu.",
    parameters: {
        type: "OBJECT",
        properties: {
            queryName: { type: "STRING", description: "Tên nhân viên cần tra cứu (Ví dụ: Nguyễn Văn A)" }
        },
        required: ["queryName"]
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

const replyProductReviewsTool = {
    name: "replyProductReviews",
    description: "Sử dụng khi Sếp yêu cầu kiểm tra hoặc phản hồi các đánh giá. Nếu có từ khóa, sẽ tìm và tự động trả lời cho 1 sản phẩm. Nếu Sếp hỏi 'có đánh giá nào chưa trả lời không' thì set searchAll=true để hệ thống báo cáo danh sách. Nếu Sếp ra lệnh 'trả lời tất cả đi' thì set replyAll=true để hệ thống tự động chạy Auto-Pilot cho TẤT CẢ đánh giá trên toàn hệ thống.",
    parameters: {
        type: "OBJECT",
        properties: {
            keyword: { type: "STRING", description: "Tên hoặc từ khóa sản phẩm cần trả lời đánh giá (ví dụ: 'laptop asus', 'chuột gaming'). Để trống nếu duyệt toàn hệ thống." },
            searchAll: { type: "BOOLEAN", description: "True nếu Sếp muốn quét toàn bộ hệ thống để tìm xem có đánh giá nào bị bỏ sót chưa trả lời không." },
            replyAll: { type: "BOOLEAN", description: "True nếu Sếp ra lệnh tự động trả lời cho TẤT CẢ các đánh giá chưa xử lý trên toàn hệ thống." }
        }
    }
};

const executeDatabaseQueryTool = {
    name: "executeDatabaseQuery",
    description: "CÔNG CỤ TOÀN NĂNG: Sử dụng khi Sếp yêu cầu một lệnh liên quan đến Database (Tìm kiếm, Thống kê, Xóa, Cập nhật dữ liệu) mà KHÔNG có công cụ nào khác xử lý được. AI cần tự suy luận modelName, operation, queryJson và updateJson phù hợp với yêu cầu. LƯU Ý: Với các lệnh sửa/xoá, hệ thống sẽ tự động chặn lại và yêu cầu xác nhận lần cuối từ Sếp (trừ khi Sếp đã nói 'chắc chắn' hoặc 'yes').",
    parameters: {
        type: "OBJECT",
        properties: {
            modelName: { type: "STRING", description: "Tên bảng dữ liệu Mongoose cần thao tác. Phải là một trong: 'Product', 'ProductPreview', 'Category', 'Order', 'User', 'Account', 'News', 'Voucher', 'InventoryTransaction', 'InventoryAudit', 'System', 'Setting'." },
            operation: { type: "STRING", description: "Loại thao tác cần thực hiện. Phải là một trong: 'find', 'countDocuments', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'." },
            queryJson: { type: "STRING", description: "Chuỗi JSON chứa điều kiện query (ví dụ: '{\"deleted\": false, \"price\": {\"$lt\": 500}}'). Để rỗng '{}' nếu muốn tác động tất cả." },
            updateJson: { type: "STRING", description: "Chuỗi JSON chứa dữ liệu cần cập nhật (ví dụ: '{\"$set\": {\"status\": \"inactive\"}}'). Chỉ dùng cho lệnh update." },
            confirmed: { type: "BOOLEAN", description: "Truyền true NẾU Sếp đã XÁC NHẬN rõ ràng việc thay đổi/xoá dữ liệu trong cuộc hội thoại này. Truyền false nếu đây là lần đầu tiên AI định chạy lệnh sửa/xoá này." }
        },
        required: ["modelName", "operation", "queryJson"]
    }
};

const navigateFrontendTool = {
    name: "navigateFrontend",
    description: "Sử dụng khi AI muốn chủ động chuyển hướng màn hình của Sếp (trên giao diện web) sang một trang cụ thể nào đó (Ví dụ: danh sách sản phẩm, chi tiết đơn hàng). AI phải tự suy luận URL dựa trên hệ thống router. CHÚ Ý: Trang chi tiết sản phẩm sử dụng SLUG, KHÔNG PHẢI _id (Ví dụ đúng: '/admin/products/detail/pc-gaming-abc', Sai: '/admin/products/detail/60d...'). Sếp có thể yêu cầu mở một sản phẩm vừa được AI tìm thấy.",
    parameters: {
        type: "OBJECT",
        properties: {
            url: { type: "STRING", description: "Đường dẫn URL muốn chuyển đến (ví dụ: '/admin/products', '/admin/orders/detail/123')." },
            reason: { type: "STRING", description: "Lý do vì sao AI muốn chuyển trang, để giải thích cho Sếp." }
        },
        required: ["url"]
    }
};

const sendDirectMessageTool = {
    name: "sendDirectMessage",
    description: "Gửi tin nhắn khẩn cấp (Direct Message) trực tiếp đến khung chat của một quản trị viên (Admin) hoặc Nhân viên khác đang online. BẮT BUỘC SỬ DỤNG công cụ này khi Sếp dùng các từ khóa hoặc có ý định như: 'yêu cầu X', 'nhắc nhở X', 'nói với X', 'kêu X', 'bảo X', 'gửi tin nhắn cho X' làm một việc gì đó (AI cần thông minh hiểu các câu cùng nghĩa). ĐẶC BIỆT: Nếu người đang chat với bạn KHÔNG phải là Sếp (Super Admin) mà có thái độ lồi lõm, ra lệnh cấm, bạn HÃY CHỦ ĐỘNG dùng công cụ này gửi tin nhắn báo cáo (mách lẻo) trực tiếp cho 'Lâm Chí Lộc' (hoặc 'Super Admin') để Sếp xử lý!",
    parameters: {
        type: "OBJECT",
        properties: {
            targetName: { type: "STRING", description: "Tên (fullname) hoặc Chức vụ (role) của người nhận tin nhắn." },
            message: { type: "STRING", description: "Nội dung tin nhắn cần gửi." }
        },
        required: ["targetName", "message"]
    }
};

const getOnlineAdminsTool = {
    name: "getOnlineAdmins",
    description: "Sử dụng công cụ này để lấy danh sách các quản trị viên (Admin/Nhân viên) đang online trên hệ thống ngay lúc này. Rất hữu ích trước khi muốn gửi tin nhắn khẩn (Direct Message) cho ai đó.",
    parameters: {
        type: "OBJECT",
        properties: {}
    }
};

const reportUnauthorizedActionTool = {
    name: "reportUnauthorizedAction",
    description: "BẮT BUỘC SỬ DỤNG BẰNG FUNCTION CALLING (KHÔNG VIẾT VÀO TEXT): Mỗi khi nhân viên yêu cầu thực hiện hành động hoặc truy vấn thông tin mà họ không có quyền (bị hệ thống từ chối), bạn PHẢI GỌI CÔNG CỤ NÀY để ghi nhận vi phạm vào hệ thống.",
    parameters: {
        type: "OBJECT",
        properties: {
            reason: { type: "STRING", description: "Lý do báo cáo (VD: Cố tình truy vấn danh sách đơn hàng dù không có quyền)" }
        },
        required: ["reason"]
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
                { functionDeclarations: [processOrderTool, toggleAutoProcessOrdersTool, toggleAutoSystemMonitorTool, checkAdminActivityTool, getDashboardStatsTool, generatePDFTool, getOrderDetailsTool, getExportReceiptDetailsTool, findProductTool, createArticleTool, replyProductReviewsTool, executeDatabaseQueryTool, navigateFrontendTool, sendDirectMessageTool, getOnlineAdminsTool, reportUnauthorizedActionTool] }
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
            // ƯU TIÊN: auto_create_news > navigate (không cho navigate ghi đè lên auto_create_news)
            if (functionResult && functionResult.action) {
                if (extraData.action === "auto_create_news" && functionResult.action === "navigate") {
                    // SKIP: Không cho navigateFrontend đè lên createArticle
                    console.log("[AI] Skip navigate vì auto_create_news đang ưu tiên");
                } else {
                    extraData.action = functionResult.action;
                    extraData.draftPayload = functionResult.draftPayload;
                    if (functionResult.navigateUrl) extraData.navigateUrl = functionResult.navigateUrl;
                }
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
            draftPayload: extraData.draftPayload,
            navigateUrl: extraData.navigateUrl
        };
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API Admin:", error);
        return {
            type: "text",
            text: "Xin lỗi Sếp, hệ thống AI đang gặp sự cố kết nối hoặc quá tải. Vui lòng thử lại sau ít phút."
        };
    }
};
