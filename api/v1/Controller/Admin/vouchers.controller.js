const Voucher = require("../../Models/vouchers.model");
module.exports.index = async (req, res) => {
    try {
        // Lấy tất cả voucher để hiển thị trong admin
        const vouchers = await Voucher.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            vouchers
        })
    } catch (error) {
        res.status(400).json({
            message: `Lỗi: ${error.message}`
        })
    }
}

module.exports.detail = async (req, res) => {
    try {
        const id = req.params.id;
        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher." });
        }
        res.status(200).json({ voucher });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error.message}` });
    }
}

module.exports.create = async (req, res) => {
    try {
        const data = req.body;
        // Kiểm tra xem mã đã tồn tại chưa
        const existing = await Voucher.findOne({ code: data.code });
        if (existing) {
            return res.status(400).json({ message: "Mã voucher này đã tồn tại." });
        }

        const newVoucher = new Voucher(data);
        await newVoucher.save();

        res.status(200).json({
            code: 200,
            message: "Tạo voucher thành công",
            voucher: newVoucher
        });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error.message}` });
    }
}

module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        const updated = await Voucher.findByIdAndUpdate(id, data, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy voucher." });
        }

        res.status(200).json({
            code: 200,
            message: "Cập nhật voucher thành công",
            voucher: updated
        });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error.message}` });
    }
}

module.exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        await Voucher.findByIdAndDelete(id);

        res.status(200).json({
            code: 200,
            message: "Xóa voucher thành công"
        });
    } catch (error) {
        res.status(400).json({ message: `Lỗi: ${error.message}` });
    }
}