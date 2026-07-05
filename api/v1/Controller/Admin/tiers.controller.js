const Tier = require("../../Models/tier.model");

module.exports.index = async (req, res) => {
  try {
    const tiers = await Tier.find({ deleted: false });
    res.json(tiers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

module.exports.create = async (req, res) => {
  try {
    const newTier = new Tier(req.body);
    await newTier.save();
    res.json({ code: 200, message: "Thêm thành công!", tier: newTier });
  } catch (error) {
    console.error("Lỗi thêm tier:", error);
    res.json({ code: 400, message: "Lỗi thêm đặc quyền hạng: " + error.message });
  }
};

module.exports.edit = async (req, res) => {
  try {
    const { id } = req.params;
    await Tier.updateOne({ _id: id }, req.body);
    res.json({ code: 200, message: "Cập nhật thành công!" });
  } catch (error) {
    res.json({ code: 400, message: "Lỗi cập nhật: " + error.message });
  }
};

module.exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await Tier.updateOne({ _id: id }, { deleted: true, deletedAt: new Date() });
    res.json({ code: 200, message: "Xóa thành công!" });
  } catch (error) {
    res.json({ code: 400, message: "Lỗi xóa: " + error.message });
  }
};
