const Orders = require("../../Models/order.model");
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
        const pendingOrder = await Orders.find({status: "peinding"}).countDocuments();
        const comfirmOrder = await Orders.find({status: "confirmed"}).countDocuments();
        const shippedOrder = await Orders.find({status: "shipped"}).countDocuments();

        let sortObj = { createdAt: -1 };
        if (req.query.sort === "price-asc") sortObj = { finalPrice: 1 };
        if (req.query.sort === "price-desc") sortObj = { finalPrice: -1 };

        const orders = await Orders.find(find)
            .sort(sortObj)
            .limit(pagination.limit)
            .skip(pagination.skip);

        res.status(200).json({ code: true, orders, pagination, status: {doneOrder, pendingOrder, comfirmOrder, shippedOrder} });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error}`, code: false });
    }
};

module.exports.updateStatus = async (req, res) => {
    try {
        const { ids, action } = req.body;
        let status = "";
        if (action === "confirmed") status = "confirmed";
        if (action === "cancel") status = "cancel";
        if (action === "done") status = "done";
        if (action === "shipped") status = "shipped";
        console.log(action)

        await Orders.updateMany({ _id: { $in: ids } }, { status });

        res.json({ code: true, message: "Cập nhật thành công" });
    } catch (error) {
        res.status(400).json({ code: false, message: "Lỗi update" });
    }
};