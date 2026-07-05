const Voucher = require("../../Models/vouchers.model");
const Orders = require("../../Models/order.model");
const jwtHelper = require("../../../../utils/jwt.utils");
const Users = require("../../Models/user.models");

module.exports.index = async (req, res) => {
    try {
        const vouchers = await Voucher.find({
            isActive: true
        });

        let usedVoucherCodes = [];
        const token_client = req.cookies.token_client;
        if (token_client) {
            try {
                const decoded = await jwtHelper.verifyToken(token_client);
                if (decoded && decoded.id) {
                    const user = await Users.findById(decoded.id);
                    if (user && user.email) {
                        const userOrders = await Orders.find({ email: user.email, voucher: { $ne: null } }).select("voucher");
                        usedVoucherCodes = userOrders.map(o => o.voucher);
                    }
                }
            } catch (err) {
                // ignore token error
            }
        }

        const formattedVouchers = vouchers.map(v => {
            const obj = v.toObject();
            obj.isUsed = usedVoucherCodes.includes(v.code);
            return obj;
        });

        res.status(200).json({
            vouchers: formattedVouchers,
            code: true
        });
    } catch (error) {
        res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}