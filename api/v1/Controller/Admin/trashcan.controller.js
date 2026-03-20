const Product = require("../../Models/products.models");
const ProductCategory = require("../../Models/products.category");
const News = require("../../Models/news.model");
const NewsCategory = require("../../Models/news.category.model");
const Account = require("../../Models/accounts.model");
const Role = require("../../Models/roles.model");

const MODEL_MAP = {
  product: Product,
  product_category: ProductCategory,
  news: News,
  news_category: NewsCategory,
  account: Account,
  role: Role,
};

const TYPE_LABEL = {
  product: "Sản phẩm",
  product_category: "Danh mục",
  news: "Bài viết",
  news_category: "Danh mục bài viết",
  account: "Tài khoản",
  role: "Nhóm quyền",
};

const getDisplayName = (item) => {
  return (
    item.title ||
    item.name ||
    item.fullName ||
    item.email ||
    item.username ||
    item.slug ||
    "Không có tên"
  );
};

// [GET] /api/v1/admin/trashcan
module.exports.index = async (req, res) => {
  try {
    const [products, productCategories, newsList, newsCategories, accounts, roles] =
      await Promise.all([
        Product.find({ deleted: true }).lean(),
        ProductCategory.find({ deleted: true }).lean(),
        News.find({ deleted: true }).lean(),
        NewsCategory.find({ deleted: true }).lean(),
        Account.find({ deleted: true }).lean(),
        Role.find({ deleted: true }).lean(),
      ]);

    const formatData = (items, type) =>
      items.map((item) => ({
        id: item._id,
        type,
        typeLabel: TYPE_LABEL[type],
        name: getDisplayName(item),
        deletedBy: item.deletedBy || "Không rõ",
        deletedAt: item.deletedAt || item.updatedAt || item.createdAt,
      }));

    let result = [
      ...formatData(products, "product"),
      ...formatData(productCategories, "product_category"),
      ...formatData(newsList, "news"),
      ...formatData(newsCategories, "news_category"),
      ...formatData(accounts, "account"),
      ...formatData(roles, "role"),
    ];

    result.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    res.status(200).json({
      code: 200,
      message: "Lấy danh sách thùng rác thành công",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/admin/trashcan/restore/:type/:id
module.exports.restoreItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = MODEL_MAP[type];

    if (!Model) {
      return res.status(400).json({
        code: 400,
        message: "Type không hợp lệ",
      });
    }

    await Model.updateOne(
      { _id: id },
      {
        deleted: false,
        deletedAt: null,
      }
    );

    res.status(200).json({
      code: 200,
      message: "Khôi phục thành công",
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [PATCH] /api/v1/admin/trashcan/restore-all
module.exports.restoreAll = async (req, res) => {
  try {
    await Promise.all([
      Product.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
      ProductCategory.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
      News.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
      NewsCategory.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
      Account.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
      Role.updateMany({ deleted: true }, { deleted: false, deletedAt: null }),
    ]);

    res.status(200).json({
      code: 200,
      message: "Khôi phục tất cả thành công",
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [DELETE] /api/v1/admin/trashcan/delete/:type/:id
module.exports.deleteItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = MODEL_MAP[type];

    if (!Model) {
      return res.status(400).json({
        code: 400,
        message: "Type không hợp lệ",
      });
    }

    await Model.deleteOne({ _id: id });

    res.status(200).json({
      code: 200,
      message: "Xóa vĩnh viễn thành công",
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [DELETE] /api/v1/admin/trashcan/delete-selected
module.exports.deleteSelected = async (req, res) => {
  try {
    const { items } = req.body;
    // items = [{ type: "product", id: "..." }, { type: "news", id: "..." }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        code: 400,
        message: "Danh sách xóa không hợp lệ",
      });
    }

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item.id);
      return acc;
    }, {});

    const tasks = Object.keys(grouped).map((type) => {
      const Model = MODEL_MAP[type];
      if (!Model) return null;
      return Model.deleteMany({ _id: { $in: grouped[type] } });
    }).filter(Boolean);

    await Promise.all(tasks);

    res.status(200).json({
      code: 200,
      message: "Xóa các mục đã chọn thành công",
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [DELETE] /api/v1/admin/trashcan/delete-all
module.exports.deleteAll = async (req, res) => {
  try {
    await Promise.all([
      Product.deleteMany({ deleted: true }),
      ProductCategory.deleteMany({ deleted: true }),
      News.deleteMany({ deleted: true }),
      NewsCategory.deleteMany({ deleted: true }),
      Account.deleteMany({ deleted: true }),
      Role.deleteMany({ deleted: true }),
    ]);

    res.status(200).json({
      code: 200,
      message: "Xóa toàn bộ thùng rác thành công",
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};