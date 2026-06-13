const Order = require("../../Models/order.model");
const User = require("../../Models/user.models");
const Product = require("../../Models/products.models");
const Notification = require("../../Models/notification.model");
const ProductReview = require("../../Models/products.preview");

// [GET] /api/v1/admin/dashboard/overview

module.exports.getOverviewData = async (targetYear) => {
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear + 1, 0, 1);
    const yearFilter = { createdAt: { $gte: startDate, $lt: endDate } };

    const lastYearStartDate = new Date(targetYear - 1, 0, 1);
    const lastYearEndDate = new Date(targetYear, 0, 1);
    const lastYearFilter = { createdAt: { $gte: lastYearStartDate, $lt: lastYearEndDate } };

    // 1. Lấy tổng quan số lượng (Đơn hàng theo năm, Khách hàng & Sản phẩm tính tổng toàn bộ)
    const totalOrders = await Order.countDocuments(yearFilter);
    const lastYearOrders = await Order.countDocuments(lastYearFilter);
    const orderGrowth = lastYearOrders === 0 ? (totalOrders > 0 ? 100 : 0) : ((totalOrders - lastYearOrders) / lastYearOrders * 100).toFixed(1);

    const totalUsers = await User.countDocuments({ deleted: false });
    const usersThisYear = await User.countDocuments({ deleted: false, ...yearFilter });
    const usersLastYear = await User.countDocuments({ deleted: false, ...lastYearFilter });
    const userGrowth = usersLastYear === 0 ? (usersThisYear > 0 ? 100 : 0) : ((usersThisYear - usersLastYear) / usersLastYear * 100).toFixed(1);

    const totalProducts = await Product.countDocuments({ deleted: false });
    const productsThisYear = await Product.countDocuments({ deleted: false, ...yearFilter });
    const productsLastYear = await Product.countDocuments({ deleted: false, ...lastYearFilter });
    const productGrowth = productsLastYear === 0 ? (productsThisYear > 0 ? 100 : 0) : ((productsThisYear - productsLastYear) / productsLastYear * 100).toFixed(1);

    // 2. Tính tổng doanh thu (chỉ tính đơn đã giao thành công / done)
    const doneOrders = await Order.find({ status: "done" });
    let totalRevenue = 0; // Sẽ tính dựa trên targetYear
    let lastYearRevenue = 0;

    // Chuẩn bị biến cho Tuần và Tháng
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const revenueWeeklyRaw = [0, 0, 0, 0, 0, 0, 0]; // T2 -> CN
    const revenueMonthlyRaw = new Array(12).fill(0); // T1 -> T12

    doneOrders.forEach(order => {
      const price = order.finalPrice || order.totalPrice || 0;
      const orderDate = new Date(order.createdAt);
      
      // Doanh thu tuần này
      if (orderDate >= startOfWeek) {
        let day = orderDate.getDay();
        let index = day === 0 ? 6 : day - 1; // Đưa CN (0) về cuối mảng (6)
        revenueWeeklyRaw[index] += price;
      }

      // Doanh thu theo tháng của năm được chọn
      if (orderDate.getFullYear() === targetYear) {
        revenueMonthlyRaw[orderDate.getMonth()] += price;
        totalRevenue += price; // Cộng vào tổng doanh thu của năm
      }

      if (orderDate.getFullYear() === targetYear - 1) {
        lastYearRevenue += price;
      }
    });

    const revenueGrowth = lastYearRevenue === 0 ? (totalRevenue > 0 ? 100 : 0) : ((totalRevenue - lastYearRevenue) / lastYearRevenue * 100).toFixed(1);

    const revenueWeekly = [
      { name: 'T2', revenue: revenueWeeklyRaw[0] },
      { name: 'T3', revenue: revenueWeeklyRaw[1] },
      { name: 'T4', revenue: revenueWeeklyRaw[2] },
      { name: 'T5', revenue: revenueWeeklyRaw[3] },
      { name: 'T6', revenue: revenueWeeklyRaw[4] },
      { name: 'T7', revenue: revenueWeeklyRaw[5] },
      { name: 'CN', revenue: revenueWeeklyRaw[6] },
    ];

    const revenueMonthly = revenueMonthlyRaw.map((rev, index) => ({
      name: `T${index + 1}`,
      revenue: rev
    }));

    // 3. Thống kê cấp độ thành viên
    const bronzeCount = await User.countDocuments({ member: "bronze", deleted: false });
    const silverCount = await User.countDocuments({ member: "silver", deleted: false });
    const goldCount = await User.countDocuments({ member: "gold", deleted: false });
    const diamondCount = await User.countDocuments({ member: "diamond", deleted: false });
    // 4. Lấy Top 10 khách hàng chi tiêu nhiều nhất (dựa trên đơn hàng done)
    const topSpenders = await Order.aggregate([
      { $match: { status: "done", ...yearFilter } },
      { 
        $group: {
          _id: "$email",
          fullname: { $first: "$fullname" },
          totalSpent: { $sum: { $cond: [{ $ifNull: ["$finalPrice", false] }, "$finalPrice", "$totalPrice"] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const weekFilter = { createdAt: { $gte: last7Days } };

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const monthFilter = { createdAt: { $gte: last30Days } };

    const getTopProducts = async (filter) => {
      return await Order.aggregate([
        { $match: { status: "done", ...filter } },
        { $unwind: "$products" },
        { 
          $group: {
            _id: "$products.productId",
            title: { $first: "$products.title" },
            price: { $first: "$products.price" },
            thumbnail: { $first: "$products.thumbnail" },
            sales: { $sum: "$products.quantity" }
          }
        },
        { $sort: { sales: -1 } },
        { $limit: 4 }
      ]);
    };

    const getCategoryData = async (filter) => {
      return await Order.aggregate([
        { $match: { status: "done", ...filter } },
        { $unwind: "$products" },
        { $lookup: { from: "products", localField: "products.productId", foreignField: "_id", as: "productInfo" } },
        { $unwind: "$productInfo" },
        { $lookup: { from: "product_categories", localField: "productInfo.product_category_id", foreignField: "_id", as: "categoryInfo" } },
        { $unwind: "$categoryInfo" },
        {
          $group: {
            _id: "$categoryInfo._id",
            name: { $first: "$categoryInfo.title" },
            sales: { $sum: "$products.finalPrice" }
          }
        },
        { $sort: { sales: -1 } },
        { $limit: 5 }
      ]);
    };

    const topProducts = {
      week: await getTopProducts(weekFilter),
      month: await getTopProducts(monthFilter),
      year: await getTopProducts(yearFilter)
    };

    const categoryData = {
      week: await getCategoryData(weekFilter),
      month: await getCategoryData(monthFilter),
      year: await getCategoryData(yearFilter)
    };

    // 7. Lấy 5 đơn hàng gần đây nhất
    const recentOrdersRaw = await Order.find().sort({ createdAt: -1 }).limit(5);
    const recentOrders = recentOrdersRaw.map(o => ({
      key: o._id,
      orderId: o.code || o._id.toString().substring(0,8).toUpperCase(),
      customer: o.fullname,
      total: o.totalPrice,
      status: o.status
    }));

    // 8. Lấy 4 hoạt động gần đây (Notification)
    const recentActivitiesRaw = await Notification.find().sort({ createdAt: -1 }).limit(4);
    const recentActivities = recentActivitiesRaw.map(n => ({
      id: n._id,
      type: n.type,
      message: n.message,
      title: n.title,
      time: n.createdAt,
      action_url: n.action_url
    }));

    // 9. Lấy 5 đánh giá gần đây
    const recentReviewsRaw = await ProductReview.find().sort({ createdAt: -1 }).limit(5).populate("product_id", "title slug");
    const recentReviews = recentReviewsRaw.map(r => ({
      id: r._id,
      customer: r.user_name || "Khách hàng",
      product: r.product_id ? r.product_id.title : r.title || "Sản phẩm ẩn",
      productSlug: r.product_id ? r.product_id.slug : null,
      rating: r.rating || 5,
      comment: r.comment || "",
      time: r.createdAt
    }));

    // 10. Mức độ hài lòng (Rating Data) theo tuần và tháng
    const getRatingData = async (filter) => {
      const data = await ProductReview.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 }
          }
        }
      ]);
      const ratingsMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      data.forEach(d => { if(d._id) ratingsMap[d._id] = d.count; });
      return [
        { name: '5 Sao', count: ratingsMap[5] },
        { name: '4 Sao', count: ratingsMap[4] },
        { name: '3 Sao', count: ratingsMap[3] },
        { name: '2 Sao', count: ratingsMap[2] },
        { name: '1 Sao', count: ratingsMap[1] }
      ];
    };

    const ratingData = {
      week: await getRatingData(weekFilter),
      month: await getRatingData(monthFilter)
    };

    return {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue,
        trends: {
          revenue: parseFloat(revenueGrowth),
          orders: parseFloat(orderGrowth),
          users: parseFloat(userGrowth),
          products: parseFloat(productGrowth)
        },
        revenueWeekly,
        revenueMonthly,
        membership: {
          bronze: bronzeCount,
          silver: silverCount,
          gold: goldCount,
          diamond: diamondCount
        },
        topSpenders,
        topProducts,
        categoryData,
        recentOrders,
        recentActivities,
        recentReviews,
        ratingData
    };
};

module.exports.overview = async (req, res) => {
  try {
    const targetYear = parseInt(req.query.year) || new Date().getFullYear();
    const data = await module.exports.getOverviewData(targetYear);
    
    return res.status(200).json({
      code: 200,
      data: data
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.json({ 
      code: 500, 
      message: "Lỗi hệ thống khi tải dữ liệu Dashboard!" 
    });
  }
};
