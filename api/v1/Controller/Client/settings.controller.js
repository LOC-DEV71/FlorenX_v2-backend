const Setting = require("../../Models/setting.model");

module.exports.detail = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    res.json({ code: 200, data: setting });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};
