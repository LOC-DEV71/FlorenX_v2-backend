const News = require("../../Models/news.model");
const paginationHelper = require("../../../../helper/pagination.helper");
const slugHelper = require("../../../../helper/slug.helper");

// [GET] /api/v1/admin/news
module.exports.index = async (req, res) => {
  try {
    const find = {
      deleted: false
    };

    const sort = {};

    // search theo tiêu đề
    if (req.query.keyword) {
      find.title = {
        $regex: req.query.keyword,
        $options: "i"
      };
    }

    // lọc trạng thái
    if (req.query.status) {
      find.status = req.query.status;
    }

    // lọc danh mục
    if (req.query.category) {
      find.category = req.query.category;
    }

    // lọc nổi bật
    if (req.query.featured) {
      find.featured = req.query.featured === "true";
    }

    // sắp xếp
    if (req.query.sort) {
      switch (req.query.sort) {
        case "newest":
          sort.createdAt = -1;
          break;
        case "oldest":
          sort.createdAt = 1;
          break;
        case "title-asc":
          sort.title = 1;
          break;
        case "title-desc":
          sort.title = -1;
          break;
        default:
          sort.createdAt = -1;
          break;
      }
    } else {
      sort.createdAt = -1;
    }

    const totalNews = await News.countDocuments(find);

    const pagination = paginationHelper.pagination(totalNews, req.query, {});

    const totalAllNews = await News.countDocuments({ deleted: false });
    const totalPublished = await News.countDocuments({
      deleted: false,
      status: "published"
    });
    const totalFeatured = await News.countDocuments({
      deleted: false,
      featured: true
    });
    const totalHidden = await News.countDocuments({
      deleted: false,
      status: "hidden"
    });

    const news = await News.find(find)
      .select("-content")
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit);

    return res.status(200).json({
      code: true,
      news,
      pagination,
      totalNews: totalAllNews,
      publishedNews: totalPublished,
      featuredNews: totalFeatured,
      hiddenNews: totalHidden
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};

// [POST] /api/v1/admin/news/create
module.exports.create = async (req, res) => {
  try {
    console.log(req.body)
    if (req.body.title) {
      req.body.slug = slugHelper(req.body.title);
    }

    const createNews = new News(req.body);
    await createNews.save();

    return res.status(200).json({
      message: "Tạo bài viết thành công",
      code: true,
      slug: createNews.slug
    });
  } catch (error) {
    return res.status(400).json({
      message: `Lỗi: ${error.message}`,
      code: false
    });
  }
};

// [POST] /api/v1/admin/news/change-multi
module.exports.changeMulti = async (req, res) => {
  try {
    const { selectId, typeChange } = req.body;

    switch (typeChange) {
      case "publish":
        await News.updateMany(
          { _id: { $in: selectId } },
          { status: "published" }
        );
        return res.status(200).json({
          code: true,
          message: "Cập nhật trạng thái xuất bản thành công"
        });

      case "draft":
        await News.updateMany(
          { _id: { $in: selectId } },
          { status: "draft" }
        );
        return res.status(200).json({
          code: true,
          message: "Cập nhật trạng thái bản nháp thành công"
        });

      case "hidden":
        await News.updateMany(
          { _id: { $in: selectId } },
          { status: "hidden" }
        );
        return res.status(200).json({
          code: true,
          message: "Ẩn bài viết thành công"
        });

      case "featured":
        await News.updateMany(
          { _id: { $in: selectId } },
          { featured: true }
        );
        return res.status(200).json({
          code: true,
          message: "Đánh dấu nổi bật thành công"
        });

      case "unfeatured":
        await News.updateMany(
          { _id: { $in: selectId } },
          { featured: false }
        );
        return res.status(200).json({
          code: true,
          message: "Bỏ nổi bật thành công"
        });

      case "delete":
        await News.updateMany(
          { _id: { $in: selectId } },
          { deleted: true }
        );
        return res.status(200).json({
          code: true,
          message: "Xóa bài viết thành công"
        });

      default:
        return res.status(400).json({
          code: false,
          message: "Hành động không hợp lệ"
        });
    }
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};

// [GET] /api/v1/admin/news/:slug
module.exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const data = await News.findOne({
      slug,
      deleted: false
    });

    return res.status(200).json({
      code: true,
      message: "Lấy bài viết thành công",
      data
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};

// [POST] /api/v1/admin/news/update/:slug
module.exports.update = async (req, res) => {
  try {
    const { slug } = req.params;

    const oldNews = await News.findOne({
      slug,
      deleted: false
    });

    if (!oldNews) {
      return res.status(404).json({
        code: false,
        message: "Không tìm thấy bài viết"
      });
    }

    if (req.body.title && req.body.title !== oldNews.title) {
      req.body.slug = slugHelper(req.body.title);
    }

    if (req.body.featured !== undefined) {
      req.body.featured = req.body.featured === "true" || req.body.featured === true;
    }

    await News.updateOne(
      { slug },
      req.body
    );

    return res.status(200).json({
      code: true,
      message: "Cập nhật bài viết thành công"
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};