const jwtUtils = require("../../../../utils/jwt.utils");
const Account = require("../../Models/accounts.model");
const ActivityLog = require("../../Models/activityLog.model");

const activityLogger = async (req, res, next) => {
    // Lưu lại hàm send/json ban đầu để chặn response
    const originalSend = res.send;

    res.send = function (body) {
        res.send = originalSend; // Khôi phục lại hàm gốc để tránh gọi đệ quy
        res.send(body); // Gửi response về cho client

        // Hàm ghi log chạy ngầm (không chặn response)
        (async () => {
            try {
                // Chỉ bắt các action làm thay đổi dữ liệu
                const methodsToLog = ['POST', 'PUT', 'PATCH', 'DELETE'];
                if (!methodsToLog.includes(req.method)) return;

                // Nếu response lỗi (status >= 400), không ghi log vì thao tác chưa thành công
                if (res.statusCode >= 400) return;

                const token = req.cookies.token_admin || req.cookies.token;
                if (!token) return;

                let decoded;
                try {
                    decoded = await jwtUtils.verifyToken(token);
                } catch (err) {
                    return; // Token không hợp lệ
                }

                if (!decoded || !decoded.id) return;

                const admin = await Account.findById(decoded.id).select("fullname");
                if (!admin) return;

                const url = req.originalUrl || req.url;
                let moduleName = "Hệ thống";
                let actionDesc = "";

                // Cố gắng bắt target (tên sản phẩm, email...) từ body hoặc query
                let targetInfo = "";
                // Do multer có thể làm req.body rỗng ở middleware ngoài, ta cố gắng lấy từ req.body nếu có
                if (req.body) {
                    if (req.body.title) targetInfo = `"${req.body.title}"`;
                    else if (req.body.fullname) targetInfo = `"${req.body.fullname}"`;
                    else if (req.body.email) targetInfo = `"${req.body.email}"`;
                    else if (req.body.orderCode) targetInfo = `"#${req.body.orderCode}"`;
                }
                
                // Nếu đổi trạng thái nhiều mục
                if (url.includes("/change-multi") && req.body && req.body.selectId) {
                    targetInfo = `hàng loạt (${req.body.selectId.length} mục)`;
                }

                // Xác định Action Type chính xác dựa vào URL (vì Backend dùng POST cho cả Update/Create)
                let actionType = req.method;
                if (url.includes("/create")) actionType = "CREATE";
                else if (url.includes("/update")) actionType = "UPDATE";
                else if (url.includes("/change-multi")) {
                    const tc = req.body?.typeChange;
                    if (tc === "delete") actionType = "DELETE";
                    else if (tc === "active") actionType = "UNLOCK";
                    else if (tc === "inactive") actionType = "LOCK";
                    else actionType = "UPDATE";
                }

                // Phân tích endpoint để dịch ra tiếng Việt cụ thể nhất
                if (url.includes("/orders")) {
                    moduleName = "Đơn hàng";
                    if (actionType === "UPDATE" || req.method === "PATCH") actionDesc = `đã cập nhật trạng thái đơn hàng ${targetInfo}`;
                    else if (actionType === "DELETE") actionDesc = `đã xóa đơn hàng ${targetInfo}`;
                    else actionDesc = `đã thao tác với đơn hàng ${targetInfo}`;
                } else if (url.includes("/product-categories")) {
                    moduleName = "Danh mục sản phẩm";
                    if (actionType === "CREATE") actionDesc = `đã tạo danh mục mới ${targetInfo}`;
                    else if (actionType === "UPDATE") actionDesc = `đã cập nhật danh mục ${targetInfo}`;
                    else if (actionType === "DELETE") actionDesc = `đã xóa danh mục ${targetInfo}`;
                    else if (actionType === "UNLOCK") actionDesc = `đã hiển thị danh mục ${targetInfo}`;
                    else if (actionType === "LOCK") actionDesc = `đã ẩn danh mục ${targetInfo}`;
                    else actionDesc = `đã thao tác với danh mục ${targetInfo}`;
                } else if (url.includes("/products")) {
                    moduleName = "Sản phẩm";
                    if (actionType === "CREATE") actionDesc = `đã tạo mới sản phẩm ${targetInfo}`;
                    else if (actionType === "UPDATE") actionDesc = `đã cập nhật sản phẩm ${targetInfo}`;
                    else if (actionType === "DELETE") actionDesc = `đã xóa sản phẩm ${targetInfo}`;
                    else if (actionType === "UNLOCK") actionDesc = `đã hiển thị sản phẩm ${targetInfo}`;
                    else if (actionType === "LOCK") actionDesc = `đã ẩn sản phẩm ${targetInfo}`;
                    else actionDesc = `đã thao tác với sản phẩm ${targetInfo}`;
                } else if (url.includes("/product-preview") || url.includes("/reviews")) {
                    moduleName = "Đánh giá";
                    if (actionType === "CREATE") actionDesc = `đã trả lời đánh giá của khách hàng ${targetInfo}`;
                    else if (actionType === "UPDATE" || req.method === "PATCH") actionDesc = `đã cập nhật đánh giá ${targetInfo}`;
                    else if (actionType === "DELETE") actionDesc = `đã xóa đánh giá ${targetInfo}`;
                    else actionDesc = `đã thao tác với đánh giá ${targetInfo}`;
                } else if (url.includes("/inventory") || url.includes("/warehouse")) {
                    moduleName = "Kho hàng";
                    if (actionType === "CREATE") actionDesc = `đã tạo phiếu kho mới ${targetInfo}`;
                    else if (actionType === "UPDATE") actionDesc = `đã cập nhật phiếu kho ${targetInfo}`;
                    else actionDesc = `đã thao tác với kho hàng ${targetInfo}`;
                } else if (url.includes("/accounts")) {
                    moduleName = "Tài khoản nhân viên";
                    if (actionType === "CREATE") actionDesc = `đã tạo tài khoản nhân viên mới ${targetInfo}`;
                    else if (actionType === "UPDATE") actionDesc = `đã cập nhật tài khoản nhân viên ${targetInfo}`;
                    else if (actionType === "DELETE") actionDesc = `đã xóa tài khoản nhân viên ${targetInfo}`;
                    else if (actionType === "UNLOCK") actionDesc = `đã mở khóa (active) tài khoản ${targetInfo}`;
                    else if (actionType === "LOCK") actionDesc = `đã khóa (inactive) tài khoản ${targetInfo}`;
                    else actionDesc = `đã thao tác với tài khoản nhân viên ${targetInfo}`;
                } else if (url.includes("/system") || url.includes("/settings")) {
                    moduleName = "Cài đặt hệ thống";
                    actionDesc = "đã thay đổi cấu hình hệ thống";
                } else {
                    return; 
                }

                // Dọn dẹp khoảng trắng thừa nếu targetInfo rỗng
                const description = `Admin ${admin.fullname} ${actionDesc}`.replace(/\s+/g, ' ').trim();

                // Ghi vào database
                await ActivityLog.create({
                    accountId: admin._id,
                    fullname: admin.fullname,
                    action: req.method,
                    module: moduleName,
                    description: description,
                    endpoint: url
                });

            } catch (error) {
                console.error("Lỗi khi ghi Activity Log:", error);
            }
        })();
    };

    next();
};

module.exports = activityLogger;
