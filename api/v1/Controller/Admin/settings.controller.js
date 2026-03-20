const Setting = require("../../Models/setting.model");

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  return false;
};

const toNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
};

// [GET] /admin/settings/detail
module.exports.detail = async (req, res) => {
  try {
    let setting = await Setting.findOne();

    if (!setting) {
      setting = await Setting.create({});
    }

    return res.status(200).json({
      code: 200,
      message: "Lấy cài đặt thành công",
      data: setting
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// [PATCH] /admin/settings/update
module.exports.update = async (req, res) => {
  try {
    let setting = await Setting.findOne();

    const updateData = {
      websiteName: req.body.websiteName || "",
      contactEmail: req.body.contactEmail || "",
      contactPhone: req.body.contactPhone || "",
      address: req.body.address || "",

      themeColor: req.body.themeColor || "blue",
      themeMode: req.body.themeMode || "light",

      postPerPage: toNumber(req.body.postPerPage, 10),
      autoApprovePost: toBoolean(req.body.autoApprovePost),
      showFeaturedPost: toBoolean(req.body.showFeaturedPost),

      sessionTimeout: toNumber(req.body.sessionTimeout, 60),
      twoFactorAuth: toBoolean(req.body.twoFactorAuth),
      strangeLoginAlert: toBoolean(req.body.strangeLoginAlert),

      saleBanner: {
        isActive: toBoolean(req.body.saleBannerIsActive),
        title: req.body.saleBannerTitle || "",
        shortDescription: req.body.saleBannerShortDescription || "",
        discountText: req.body.saleBannerDiscountText || "",
        redirectLink: req.body.saleBannerRedirectLink || "",
        startDate: req.body.saleBannerStartDate || null,
        endDate: req.body.saleBannerEndDate || null
      }
    };

    if (setting) {
      updateData.logo = req.body.logo || setting.logo || "";
      updateData.favicon = req.body.favicon || setting.favicon || "";

      updateData.saleBanner.desktopImage =
        req.body.bannerDesktop || setting.saleBanner?.desktopImage || "";
      updateData.saleBanner.mobileImage =
        req.body.bannerMobile || setting.saleBanner?.mobileImage || "";

      await Setting.updateOne({ _id: setting._id }, updateData);

      const newSetting = await Setting.findById(setting._id);
       console.log(newSetting)

      return res.status(200).json({
        code: 200,
        message: "Cập nhật cài đặt thành công",
        data: newSetting
      });
    }

    updateData.logo = req.body.logo || "";
    updateData.favicon = req.body.favicon || "";
    updateData.saleBanner.desktopImage = req.body.bannerDesktop || "";
    updateData.saleBanner.mobileImage = req.body.bannerMobile || "";

    const newSetting = await Setting.create(updateData);

    return res.status(200).json({
      code: 200,
      message: "Tạo cài đặt thành công",
      data: newSetting
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message
    });
  }
};