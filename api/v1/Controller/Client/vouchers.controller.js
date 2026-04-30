const Voucher = require("../../Models/vouchers.model");
module.exports.index = async (req, res) => {
    try {
        const vouchers = await Voucher.find({
            isActive: true
        })

        res.status(200).json({
            vouchers,
            code: true
        })
    } catch (error) {
        res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}