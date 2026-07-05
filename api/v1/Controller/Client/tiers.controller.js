const Tier = require("../../Models/tier.model");

module.exports.index = async (req, res) => {
  try {
    const tiers = await Tier.find({ deleted: false });
    res.json(tiers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};
