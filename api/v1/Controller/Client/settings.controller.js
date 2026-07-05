const Setting = require("../../Models/setting.model");
const Hero = require("../../Models/hero.model");
const Slider = require("../../Models/slider.model");
const SalePage = require("../../Models/sale_page.model");
const CategoryBanner = require("../../Models/category_banner.model");

module.exports.detail = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    
    const section_hero_slider = await Slider.find().sort({ order: 1 });
    const sale_page = await SalePage.find().sort({ order: 1 });
    const category_banners = await CategoryBanner.find().sort({ order: 1 });

    res.json({ 
      code: 200, 
      data: { 
        ...setting.toObject(), 
        section_hero_slider, 
        sale_page,
        category_banners
      } 
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};
