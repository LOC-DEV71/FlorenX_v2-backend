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