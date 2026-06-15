const News = require("../../Models/news.model");
const NewsCategory = require("../../Models/news.category.model");

// Lấy danh sách các tin tức theo danh mục
module.exports.getByCategorySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const { featured, limit } = req.query;
        
        let query = {
            deleted: false,
            slug_category: slug,
            status: "published"
        };
        if (featured === "true") {
            query.featured = "yes";
        }
        
        let mongoQuery = News.find(query).select("-content").sort({ createdAt: -1 });
        
        if (limit) {
            mongoQuery = mongoQuery.limit(parseInt(limit));
        }
        
        const news = await mongoQuery;

        return res.status(200).json({
            code: true, 
            news
        });
    } catch (error) {
        return res.status(400).json({
            code: false, 
            message: `Lỗi: ${error}`
        });
    }
};

// Lấy chi tiết 1 bài viết dựa vào slug của nó
module.exports.getDetailBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const news = await News.findOne({
            deleted: false,
            slug: slug,
            status: "published"
        });

        if (!news) {
            return res.status(404).json({
                code: false,
                message: "Không tìm thấy bài viết"
            });
        }

        // Tăng lượt view lên 1 mỗi khi fetch chi tiết
        await News.updateOne(
            { _id: news._id },
            { $inc: { views: 1 } }
        );
        news.views += 1;

        return res.status(200).json({
            code: true, 
            news
        });
    } catch (error) {
        return res.status(400).json({
            code: false, 
            message: `Lỗi: ${error}`
        });
    }
};

// Lấy tất cả danh mục tin tức đang hoạt động
module.exports.getCategories = async (req, res) => {
    try {
        const categories = await NewsCategory.find({
            deleted: false,
            status: "active"
        }).select("title slug");

        return res.status(200).json({
            code: true, 
            categories
        });
    } catch (error) {
        return res.status(400).json({
            code: false, 
            message: `Lỗi: ${error}`
        });
    }
};

// Lấy tin tức mới nhất
module.exports.getRecent = async (req, res) => {
    try {
        const news = await News.find({
            deleted: false,
            status: "published"
        })
        .select("-content")
        .sort({ createdAt: -1 })
        .limit(4);

        return res.status(200).json({
            code: true, 
            news
        });
    } catch (error) {
        return res.status(400).json({
            code: false, 
            message: `Lỗi: ${error}`
        });
    }
};