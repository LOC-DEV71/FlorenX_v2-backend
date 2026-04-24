const News = require("../../Models/news.model");
module.exports.getBySlug = async (req, res) => {
    try {
        const {slug} = req.params;
        const news = await News.find({
            deleted: false,
            slug_category: slug,
            featured: "true",
            status: "published"
        })
        return res.status(200).json({
            code: true, 
            news
        })
    } catch (error) {
        return res.status(400).json({
            code: false, 
            message: `Lỗi: ${error}`
        })
    }
}