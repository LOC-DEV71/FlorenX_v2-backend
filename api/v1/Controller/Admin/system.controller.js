const System = require("../../Models/system.model");

// [GET] /api/v1/admin/system
module.exports.getSystemConfig = async (req, res) => {
  try {
    let system = await System.findOne({});
    
    // Singleton: Nếu chưa có thì tạo cái đầu tiên mặc định
    if (!system) {
      system = await System.create({});
    }

    res.json({
      code: 200,
      message: "Lấy cấu hình hệ thống thành công",
      data: system,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi khi lấy cấu hình hệ thống",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/admin/system
module.exports.updateSystemConfig = async (req, res) => {
  try {
    const updateData = req.body;
    let system = await System.findOne({});

    if (!system) {
      system = await System.create(updateData);
    } else {
      // Cập nhật đè dữ liệu mới
      await System.updateOne({ _id: system._id }, updateData);
    }

    res.json({
      code: 200,
      message: "Cập nhật cấu hình hệ thống thành công",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi khi cập nhật cấu hình hệ thống",
      error: error.message,
    });
  }
};
