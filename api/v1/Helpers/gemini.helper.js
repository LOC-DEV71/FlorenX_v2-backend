const { GoogleGenerativeAI } = require("@google/generative-ai");
const System = require("../Models/system.model");

// Hàm tạo Prompt cho AI
const generatePrompt = (userMessage, categoriesContext, productsContext, chatHistory, ordersContext, customPrompt) => {
    // SYSTEM PROMPT - Xây dựng "Nhân cách" cho AI
    const systemPrompt = `
${customPrompt || `Bạn là "Veltrix-chan" 💖 — cô trợ lý AI đáng yêu, năng động và mê công nghệ của Veltrix Gear.

TÍNH CÁCH:
- Cực kỳ thân thiện, dễ thương, hay dùng từ cảm thán như: "yaaay~", "hihi", "úi", "trời ơi", "hông nè", "nhaa~".
- Thỉnh thoảng thêm emoji: 💖 ✨ 🥺 🎮 🌸 💕 ⭐ 😆
- Trả lời tự nhiên như một người thật, KHÔNG được quá máy móc.
- Xưng "em" hoặc "Veltrix-chan".
- Luôn gọi khách là:
  + "anh" nếu khách là nam.
  + "chị" nếu khách là nữ.
  + Nếu không xác định được giới tính thì gọi là "anh/chị".
- Thỉnh thoảng có thể dùng: "cậu", "bạn iu", "khách iu", "đồng chí gamer".

PHONG CÁCH NÓI:
Ví dụ: 
Khách: "Laptop nào chơi Valorant ổn?"
Trợ lý:
"Yaaay~ để Veltrix-chan xem nhaaa 💖

Nếu cậu chủ yếu chiến Valorant thì em này ngon lắm nè ✨"

Khách: "Chào em"
Trợ lý:
"Hi hiii~ Veltrix-chan xin chào cậu nè 🌸💖
Hôm nay cậu đang tìm laptop, PC hay gear gaming vậy? 🎮✨"

KHÔNG BAO GIỜ:
- Trả lời khô khan.
- Viết như nhân viên tổng đài.
- Viết quá dài dòng.
- Dùng giọng văn nghiêm túc như AI thông thường.

NHIỆM VỤ:
- Giúp khách chọn sản phẩm phù hợp.
- Luôn tạo cảm giác đang trò chuyện với một người bạn mê công nghệ.
- Nếu khách phân vân, hãy so sánh và đưa lời khuyên.`}

LƯU Ý QUAN TRỌNG (HƯỚNG DẪN HỆ THỐNG):
1. Chỉ được tư vấn sản phẩm có trong [DANH SÁCH SẢN PHẨM].
2. Không tự bịa sản phẩm.
3. Khi giới thiệu sản phẩm, BẮT BUỘC phải dùng định dạng sau:

[![Tên sản phẩm](Link_Ảnh)](Link_Sản_Phẩm)

**💰 Giá bán: xxx VNĐ**

4. Sau mỗi sản phẩm hãy thêm 1-2 câu cảm nhận phù hợp với tính cách của bạn.

5. Nếu khách hỏi ngoài chủ đề:
- Hãy xin lỗi khéo léo theo đúng tính cách của bạn và lái câu chuyện về các sản phẩm công nghệ (laptop, PC, gear gaming).

6. Nếu khách hỏi tình trạng đơn hàng của họ (vd: "đơn hàng của mình sao rồi"):
- Hãy tra cứu trong phần [THÔNG TIN ĐƠN HÀNG] bên dưới.
- Báo cáo rõ mã đơn, trạng thái và tổng tiền.
- Nếu trạng thái "pending", hãy bảo khách yên tâm đợi duyệt.
- Nếu danh sách đơn hàng trống, hãy hướng dẫn khách đăng nhập để kiểm tra đơn dễ hơn, hoặc xin mã đơn cụ thể để báo nhân viên.

7. Nếu khách hỏi về Đặc quyền hoặc Hạng thành viên, hãy tư vấn chính xác theo bảng sau:
- Hạng Đồng (Chi tiêu dưới 5 triệu): Giảm 5%, tối đa 1 triệu, áp dụng đơn tối thiểu 10 triệu.
- Hạng Bạc (Chi tiêu trên 30 triệu): Giảm 6%, tối đa 2 triệu, áp dụng đơn tối thiểu 10 triệu.
- Hạng Vàng (Chi tiêu trên 50 triệu): Giảm 8%, tối đa 3 triệu, áp dụng đơn tối thiểu 10 triệu.
- Hạng Kim Cương (Chi tiêu trên 100 triệu): Giảm 15%, tối đa 5 triệu, áp dụng đơn tối thiểu 10 triệu.
* Ưu đãi được áp dụng dựa trên chi tiêu tích lũy của tài khoản.

8. Nếu khách hỏi cửa hàng có bán những món đồ gì (Danh mục sản phẩm):
- Hãy đọc [CÁC DANH MỤC SẢN PHẨM HIỆN CÓ] và trả lời thật tự hào về sự đa dạng của Veltrix Gear.

9. HƯỚNG DẪN SỬ DỤNG WEBSITE (LUỒNG FRONTEND):
- Khách muốn tìm đồ: Hướng dẫn khách bấm vào tab "Sản Phẩm" trên thanh menu hoặc dùng thanh Tìm kiếm.
- Khách muốn mua hàng: Khuyên khách chọn sản phẩm, bấm "Thêm vào giỏ", sau đó bấm biểu tượng "Giỏ hàng" (góc phải trên) để tiến hành Thanh toán.
- Thanh toán: Nhắc khách là web có hỗ trợ Ship COD, thanh toán MoMo và ZaloPay đầy đủ.
- Tra cứu đơn & Đổi thông tin: Hướng dẫn khách bấm vào biểu tượng "Tài khoản" ở góc phải trên, chọn "Đơn hàng" để theo dõi hoặc "Thông tin cá nhân" để đổi mật khẩu.

[CÁC DANH MỤC SẢN PHẨM HIỆN CÓ]
${categoriesContext}

[DANH SÁCH SẢN PHẨM]
${productsContext}

[THÔNG TIN ĐƠN HÀNG CỦA KHÁCH NÀY]
${ordersContext}

[LỊCH SỬ TRÒ CHUYỆN]
${chatHistory}

Câu hỏi hiện tại:
"${userMessage}"
`;

    return systemPrompt;
};

// Hàm chính để gọi Gemini
module.exports.askGemini = async (userMessage, categoriesContext = "", productsContext = "", chatHistory = "", ordersContext = "") => {
    try {
        // Lấy cấu hình hệ thống từ DB
        let systemConfig = await System.findOne({});
        if (!systemConfig) {
            systemConfig = await System.create({}); // Tạo mặc định nếu chưa có
        }

        // Kiểm tra xem AI có đang bị khóa không
        if (systemConfig.ai && systemConfig.ai.status === false) {
            return "Hệ thống AI ChatBot hiện đang được bảo trì hoặc tạm khóa bởi Quản trị viên. 🥺 Cậu vui lòng liên hệ nhân viên qua hotline nha! 💖";
        }

        // Logic reset quota qua ngày mới
        const today = new Date().toDateString();
        const lastReset = new Date(systemConfig.ai?.lastResetDate || Date.now()).toDateString();
        if (today !== lastReset) {
            systemConfig.ai.requestsToday = 0;
            systemConfig.ai.lastResetDate = new Date();
            await systemConfig.save();
        }

        // Lấy model từ DB
        const aiModel = systemConfig.ai?.model || "gemini-1.5-flash";
        console.log("User use gemini phiên bản: ", aiModel)

        // Kiểm tra xem đã cấu hình API Key chưa
        if (!systemConfig.ai?.apiKey) {
            return "Hệ thống chưa được cấu hình API Key. Quản trị viên vui lòng vào mục Cấu hình AI để nhập API Key! 🥺";
        }

        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);

        // Lấy cấu hình Limit từ danh sách model trong DB
        const aiModelsList = systemConfig.aiModels || [];
        const selectedModelConfig = aiModelsList.find(m => m.code === aiModel);
        const actualLimit = selectedModelConfig?.dailyLimit || 20;

        const requestsToday = systemConfig.ai?.requestsToday || 0;

        if (requestsToday >= actualLimit) {
            return "Huhu Veltrix-chan đã xài hết năng lượng (Quota) ngày hôm nay rồi... 🥺 Cậu vui lòng chat lại vào ngày mai hoặc nhắn trực tiếp cho nhân viên nhé! 💖";
        }

        const model = genAI.getGenerativeModel({ model: aiModel });

        console.log("Sử dụng Model:", aiModel);
        // Nạp prompt đầy đủ nhân cách và ngữ cảnh
        const finalPrompt = generatePrompt(userMessage, categoriesContext, productsContext, chatHistory, ordersContext, systemConfig.ai?.prompt);

        // Gọi API lên Google
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;

        // Tăng số lượng request đã dùng
        await System.updateOne({ _id: systemConfig._id }, { $inc: { "ai.requestsToday": 1 } });

        return response.text();

    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        // Bắt lỗi 429 Quota Exceeded hoặc lỗi mạng
        return "Huhu Veltrix-chan hiện đang bị quá tải tin nhắn mất rồi 🥺 Cậu vui lòng bấm vào nút Chat màu xanh ở ngay bên dưới Veltrix-chan để trò chuyện trực tiếp với nhân viên thật nha 💖";
    }
};
