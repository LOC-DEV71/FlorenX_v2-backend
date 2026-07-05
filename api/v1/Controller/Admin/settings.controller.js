const Setting = require("../../Models/setting.model");
const Hero = require("../../Models/hero.model");
const Slider = require("../../Models/slider.model");
const SalePage = require("../../Models/sale_page.model");
const CategoryBanner = require("../../Models/category_banner.model");

const toBoolean = (v) => v === "true" || v === true;
const toNumber = (v, d = 0) => (isNaN(Number(v)) ? d : Number(v));

module.exports.detail = async (req, res) => {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({});
  
  const section_hero_slider = await Slider.find().sort({ order: 1 });
  const sale_page = await SalePage.find().sort({ order: 1 });
  const category_banners = await CategoryBanner.find().sort({ order: 1 });

  res.json({ code: 200, data: { ...setting.toObject(), section_hero_slider, sale_page, category_banners } });
};

module.exports.update = async (req, res) => {
  try {
    let setting = await Setting.findOne();

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
      logo: req.body.logo || (setting?.logo || ""),
      favicon: req.body.favicon || (setting?.favicon || "")
    };

    if (setting) {
      await Setting.updateOne({ _id: setting._id }, updateData);
    } else {
      await Setting.create(updateData);
    }

    let sectionHeroSliderItems = JSON.parse(req.body.sectionHeroSliderItems || "[]");
    await Slider.deleteMany({});
    if (sectionHeroSliderItems.length > 0) {
      const sliders = sectionHeroSliderItems.map((item, i) => ({
        image: req.body[`sliderImage_${i}`] || item.image || "",
        title: item.title,
        tag: item.tag,
        link: item.link,
        order: i
      }));
      await Slider.insertMany(sliders);
    }

    let salePageItems = JSON.parse(req.body.salePageItems || "[]");
    await SalePage.deleteMany({});
    if (salePageItems.length > 0) {
      const salePages = salePageItems.map((item, i) => ({
        type: item.type || "section",
        mediaUrl: req.body[`saleMedia_${i}`] || item.mediaUrl || "",
        title: item.title,
        desc: item.desc,
        tag: item.tag,
        tagClassName: item.tagClassName,
        link: item.link,
        order: i
      }));
      await SalePage.insertMany(salePages);
    }

    let categoryBannersItems = JSON.parse(req.body.categoryBannersItems || "[]");
    await CategoryBanner.deleteMany({});
    if (categoryBannersItems.length > 0) {
      const banners = categoryBannersItems.map((item, i) => ({
        categorySlug: item.categorySlug || "",
        title: item.title,
        description: item.description,
        image: req.body[`categoryBannerImage_${i}`] || item.image || "",
        order: i
      }));
      await CategoryBanner.insertMany(banners);
    }

    res.json({ code: 200, message: "Cập nhật thành công!" });
  } catch (error) {
    console.log("Update settings error:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
};