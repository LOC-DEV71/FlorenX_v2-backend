const NewsCategory = require("../../Models/news.category.model");
const paginationHelper = require("../../../../helper/pagination.helper");

// [GET] /api/v1/admin/news-category
module.exports.index = async (req, res) => {
  try {
    const find = {
      deleted: false
    };
    const sort = {};

    // filter status
    if (req.query.status) {
      find.status = req.query.status;
    }

    // search
    if (req.query.keyword) {
      find.title = {
        $regex: req.query.keyword,
        $options: "i"
      };
    }

    // sort
    if (req.query.sort) {
      const [key, value] = req.query.sort.split("-");

      if (key === "name" || key === "title") {
        sort.title = value === "asc" ? 1 : -1;
      }

      if (key === "createdAt" || key === "newest") {
        sort.createdAt = value === "asc" ? 1 : -1;
      }
    }

    if (Object.keys(sort).length === 0) {
      sort.createdAt = -1;
    }

    const totalCategory = await NewsCategory.countDocuments({});
    const activeCategory = await NewsCategory.countDocuments({ status: "active" });
    const inactiveCategory = await NewsCategory.countDocuments({ status: "inactive" });

    const featuredCategory = await NewsCategory.countDocuments({ featured: "yes" }).catch(() => 0);

    const pagination = paginationHelper.pagination(totalCategory, req.query, {});

    const newsCategory = await NewsCategory.find(find)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit);

    return res.status(200).json({
      code: true,
      newsCategory,
      pagination,
      totalCategory,
      activeCategory,
      inactiveCategory,
      featuredCategory
    });
  } catch (error) {
    return res.status(400).json({
      message: `Lỗi: ${error.message}`,
      code: false
    });
  }
};



// [POST] /api/v1/admin/news-category/get-list
module.exports.getList = async (req, res) => {
  try {
    const categories = await NewsCategory.find({
      deleted: false
    })
    return res.status(200).json({
      code: true,
      categories
    })
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`,
      code: false
    })
  }
}


// [POST] /api/v1/admin/news-category/change-multi
module.exports.changeMulti = async (req, res) => {
  try {
    const { selectId, typeChange } = req.body;

    if (!selectId || !selectId.length) {
      return res.status(400).json({
        code: false,
        message: "Vui lòng chọn danh mục"
      });
    }

    if (typeChange === "active" || typeChange === "inactive") {
      await NewsCategory.updateMany(
        { _id: { $in: selectId } },
        { status: typeChange }
      );

      return res.status(200).json({
        code: true,
        message: "Cập nhật trạng thái thành công"
      });
    }

    if (typeChange === "delete") {
      await NewsCategory.updateMany({
        _id: { $in: selectId },
      },
        {deleted: true}
      );

      return res.status(200).json({
        code: true,
        message: "Xoá danh mục thành công"
      });
    }

    return res.status(400).json({
      code: false,
      message: "Hành động không hợp lệ"
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};
module.exports.getBySlug = async (req, res) => {
    try {
        const {slug} = req.params;
       const newsCategory = await NewsCategory.findOne({
        slug: slug,
        deleted: false
       })
        return res.status(200).json({
            code: true, newsCategory
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
module.exports.create = async (req, res) => {
    try {
        const createNewsCategory = new NewsCategory(req.body)
        await createNewsCategory.save();
        return res.status(200).json({
            message: "Tạo danh mục bài viết thành công",
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
module.exports.update = async (req, res) => {
    try {
       await NewsCategory.updateOne({slug: req.body.slug}, req.body)
       const newsCategory = await NewsCategory.findOne({slug: req.body.slug})
        return res.status(200).json({
            message: "Cập nhật danh mục bài viết thành công",
            code: true,
            newsCategory
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}