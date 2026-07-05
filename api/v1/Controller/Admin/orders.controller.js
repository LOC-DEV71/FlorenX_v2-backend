const Orders = require("../../Models/order.model");
const User = require("../../Models/user.models");
const paginationHelper = require("../../../../helper/pagination.helper");

module.exports.index = async (req, res) => {
    try {
        const keyword = req.query.search;
        const sortStatus= req.query.sortStatus;
        let find = {};

        switch (sortStatus) {
            case "pending":
                find.status= "pending"
                break;
            case "confirmed":
                find.status= "confirmed"
                break;
            case "done":
                find.status= "done"
                break;
            case "cancel":
                find.status= "cancel"
                break;
            case "shipped":
                find.status= "shipped"
                break;
            case "suspicious":
                find.status= "suspicious"
                break;
        
            default:
                break;
        }

        if (keyword) {
            find.$or = [
                { code: { $regex: keyword, $options: "i" } },
                { fullname: { $regex: keyword, $options: "i" } },
                { phone: { $regex: keyword, $options: "i" } }
            ];
        }

        const countDocuments = await Orders.countDocuments(find);
        const pagination = paginationHelper.pagination(countDocuments, req.query);

        const doneOrder = await Orders.find({status: "done"}).countDocuments();
        const pendingOrder = await Orders.find({status: "pending"}).countDocuments();
        const comfirmOrder = await Orders.find({status: "confirmed"}).countDocuments();
        const shippedOrder = await Orders.find({status: "shipped"}).countDocuments();
        const suspiciousOrder = await Orders.find({status: "suspicious"}).countDocuments();

        let sortObj = { createdAt: -1 };
        if (req.query.sort === "price-asc") sortObj = { finalPrice: 1 };
        if (req.query.sort === "price-desc") sortObj = { finalPrice: -1 };

        const orders = await Orders.find(find)
            .sort(sortObj)
            .limit(pagination.limit)
            .skip(pagination.skip);

        res.status(200).json({ code: true, orders, pagination, status: {doneOrder, pendingOrder, comfirmOrder, shippedOrder, suspiciousOrder} });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error}`, code: false });
    }
};

module.exports.updateStatus = async (req, res) => {
    try {
        const { ids, action } = req.body;
    

        const validStatuses = ["pending", "confirmed", "shipped", "done", "cancel", "suspicious"];

        if (!validStatuses.includes(action)) {
            return res.status(400).json({ code: false, message: "Trạng thái không hợp lệ" });
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ code: false, message: "Danh sách đơn hàng không hợp lệ" });
        }

        await Orders.updateMany({ _id: { $in: ids } }, { status: action });

        if (action === "done") {
            const doneOrders = await Orders.find({ _id: { $in: ids } }).select("email");

            // Lấy danh sách email duy nhất
            const emails = [...new Set(
                doneOrders
                    .filter(o => o.email)
                    .map(o => o.email)
            )];

            // Cập nhật hạng cho từng user theo email
            for (const email of emails) {
                // Tính tổng chi tiêu tích lũy từ tất cả đơn "done" của email này
                const result = await Orders.aggregate([
                    {
                        $match: {
                            email: email,
                            status: "done"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$finalPrice" }
                        }
                    }
                ]);

                const totalSpent = result[0]?.total || 0;

                // Xác định hạng theo tổng chi tiêu tích lũy
                let member = "bronze";
                if (totalSpent >= 100_000_000)     member = "diamond";
                else if (totalSpent >= 50_000_000) member = "gold";
                else if (totalSpent >= 30_000_000) member = "silver";

                await User.updateOne({ email }, { member });
            }
        }

        res.json({ code: true, message: "Cập nhật thành công" });
    } catch (error) {
        res.status(400).json({ code: false, message: `Lỗi update: ${error.message}` });
    }
};
module.exports.getDetailOrder = async (req, res) => {
    try {
        const code = req.params.code;
        
        const order = await Orders.findOne({code: code});

        res.json({ code: true, message: "OK", order  });
    } catch (error) {
        res.status(400).json({ code: false, message: `Lỗi update: ${error.message}` });
    }
};