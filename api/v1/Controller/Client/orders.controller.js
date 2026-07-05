const Orders = require("../../Models/order.model");
const Users = require("../../Models/user.models");
const jwtHelper = require("../../../../utils/jwt.utils");
module.exports.getList = async (req, res) => {
    try {
        const token_client = req.cookies.token_client;
        const decode = await jwtHelper.verifyToken(token_client)
        const user = await Users.findOne({
            _id: decode.id
        }).select("email")

        const orders = await Orders.find({
            email: user.email
        })
        
        return res.status(200).json({
            code: true,
            orders
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.cancelOrder = async (req, res) => {
    try {
        console.log("=== API cancelOrder hit ===", req.params);
        const token_client = req.cookies.token_client;
        if (!token_client) {
            console.log("No token_client cookie found");
            return res.status(401).json({ code: false, message: "Không tìm thấy token" });
        }

        const decode = await jwtHelper.verifyToken(token_client);
        if (!decode) {
            console.log("Invalid token");
            return res.status(401).json({ code: false, message: "Token không hợp lệ" });
        }

        const user = await Users.findOne({
            _id: decode.id
        }).select("email"); 

        console.log("User fetched:", user ? user.email : null);

        const { id } = req.params;

        const order = await Orders.findOne({
            _id: id,
            email: user.email
        });

        if (!order) {
            console.log("Order not found:", id);
            return res.status(404).json({
                code: false,
                message: "Không tìm thấy đơn hàng"
            });
        }

        if (order.status !== "pending") {
            console.log("Order not pending:", order.status);
            return res.status(400).json({
                code: false,
                message: "Chỉ được huỷ đơn hàng đang chờ xác nhận"
            });
        }

        await Orders.updateOne(
            { _id: id },
            { status: "cancel" }
        );

        console.log("Order cancelled successfully");
        return res.status(200).json({
            code: true,
            message: "Huỷ đơn hàng thành công"
        });
    } catch (error) {
        console.error("Error in cancelOrder:", error);
        return res.status(400).json({
            message: `Lỗi: ${error.message || error}`,
            code: false
        });
    }
}