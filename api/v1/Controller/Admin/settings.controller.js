const Setting = require("../../Models/setting.model");

const toBoolean = (v) => v === "true" || v === true;
const toNumber = (v, d = 0) => (isNaN(Number(v)) ? d : Number(v));

module.exports.detail = async (req, res) => {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({});
  res.json({ code: 200, data: setting });
};

module.exports.update = async (req, res) => {
  try {
    let setting = await Setting.findOne();

    let sectionHeroItems = JSON.parse(req.body.sectionHeroItems || "[]");
    let sectionHeroSliderItems = JSON.parse(req.body.sectionHeroSliderItems || "[]");

    const heroUploadedImages = req.body.sectionHeroUploadedLinks || [];
    const heroSliderUploadedImages = req.body.sectionHeroSliderUploadedLinks || [];

    let heroUploadIdx = 0;
    let heroSliderUploadIdx = 0;

    const finalSectionHero = sectionHeroItems.map((item) => {
      const newItem = { ...item };

      if (newItem.hasNewImage) {
        newItem.image = heroUploadedImages[heroUploadIdx] || newItem.image || "";
        heroUploadIdx++;
      }

      delete newItem.hasNewImage;
      delete newItem.imagePreview;
      return newItem;
    });

    const finalSectionHeroSlider = sectionHeroSliderItems.map((item) => {
      const newItem = { ...item };

      if (newItem.hasNewImage) {
        newItem.image =
          heroSliderUploadedImages[heroSliderUploadIdx] || newItem.image || "";
        heroSliderUploadIdx++;
      }

      delete newItem.hasNewImage;
      delete newItem.imagePreview;
      return newItem;
    });

    const updateData = {
      websiteName: req.body.websiteName,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
      address: req.body.address,
      themeColor: req.body.themeColor,
      themeMode: req.body.themeMode,
      postPerPage: toNumber(req.body.postPerPage, 10),
      autoApprovePost: toBoolean(req.body.autoApprovePost),
      showFeaturedPost: toBoolean(req.body.showFeaturedPost),
      sessionTimeout: toNumber(req.body.sessionTimeout, 60),
      twoFactorAuth: toBoolean(req.body.twoFactorAuth),
      strangeLoginAlert: toBoolean(req.body.strangeLoginAlert),
      saleBanner: {
        isActive: toBoolean(req.body.saleBannerIsActive),
        title: req.body.saleBannerTitle,
        shortDescription: req.body.saleBannerShortDescription,
        discountText: req.body.saleBannerDiscountText,
        redirectLink: req.body.saleBannerRedirectLink,
        startDate: req.body.saleBannerStartDate || null,
        endDate: req.body.saleBannerEndDate || null,
        desktopImage: req.body.bannerDesktop || (setting?.saleBanner?.desktopImage || ""),
        mobileImage: req.body.bannerMobile || (setting?.saleBanner?.mobileImage || "")
      },
      section_hero: finalSectionHero,
      section_hero_slider: finalSectionHeroSlider,
      logo: req.body.logo || (setting?.logo || ""),
      favicon: req.body.favicon || (setting?.favicon || "")
    };

    if (setting) {
      await Setting.updateOne({ _id: setting._id }, updateData);
    } else {
      await Setting.create(updateData);
    }

    res.json({ code: 200, message: "Cập nhật thành công!" });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};