const paypal = require("@paypal/checkout-server-sdk");
const Orders = require("../../Models/order.model");
const Carts = require("../../Models/cart.model");
const Users = require("../../Models/user.models");
const Vouchers = require("../../Models/vouchers.model");
const OrderCode = require("../../../../helper/generalOtp");
const formSendMail = require("../../../../helper/formSendMail");
const jwtHelper = require("../../../../utils/jwt.utils");
const Notification = require("../../Models/notification.model");
const System = require("../../Models/system.model");
const Tier = require("../../Models/tier.model");
const { processOrderLogic } = require("../../Helpers/ai.automation.helper");

const getPayPalClient = async () => {
  const system = await System.findOne({});
  if (system?.payment && !system.payment.paypalStatus) {
    throw new Error("Cổng thanh toán PayPal hiện đang bảo trì hoặc bị tắt.");
  }
  const clientId = system?.payment?.paypalClientId || process.env.PAY_PAL_ID;
  const clientSecret = system?.payment?.paypalClientSecret || process.env.PAY_PAL_SECRET;
  
  const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
};

const createOrder = async (req, res) => {
  try {
    const client = await getPayPalClient();
    const { amount } = req.body;
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: amount } }]
    });

    const order = await client.execute(request);
    res.json({ orderID: order.result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const captureOrder = async (req, res) => {
  try {
    const client = await getPayPalClient();
    const { orderID } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await client.execute(request);
    res.json({ status: capture.result.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getPaymentConfig = async (req, res) => {
  try {
    const system = await System.findOne({});
    const activeBanks = system?.banks?.filter(b => b.status) || [];
    res.json({
      code: 200,
      banks: activeBanks,
      bankTransferStatus: system?.payment?.bankTransferStatus ?? true,
      paypalStatus: system?.payment?.paypalStatus ?? true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.createOrder = createOrder;
module.exports.captureOrder = captureOrder;

module.exports.order = async (req, res) => {
  try {
    const { voucher: voucherCode, email, products, fullname, address, phone, pay } = req.body;
    let voucherData = null;

    if (voucherCode) {
      voucherData = await Vouchers.findOne({
        code: voucherCode,
      }).select("discountValue maxDiscount minOrderValue quantity usedCount discountType");

      if (!voucherData) {
        return res.status(400).json({
          code: false,
          message: `Voucher không tồn tại`,
        });
      }

      if (voucherData.usedCount >= voucherData.quantity) {
        return res.status(400).json({
          code: false,
          message: `Voucher đã hết lượt sử dụng`,
        });
      }

      // Kiểm tra xem khách hàng (email) này đã dùng voucher này chưa
      const hasUsedVoucher = await Orders.findOne({ email: email, voucher: voucherCode });
      if (hasUsedVoucher) {
        return res.status(400).json({
          code: false,
          message: `Bạn đã sử dụng mã giảm giá này rồi`,
        });
      }
    }

    let user = null;
    if (req.cookies.token_client) {
      try {
        const decoded = await jwtHelper.verifyToken(req.cookies.token_client);
        if (decoded && decoded.id) {
          user = await Users.findOne({ _id: decoded.id });
        }
      } catch (err) {
        // Token lỗi hoặc chưa đăng nhập, coi như khách mua vãng lai (guest)
      }
    }



    const totalPrice = req.body.products.reduce((total, item) => total + (item.price - item.price * item.discountPercentage / 100) * item.quantity, 0);

    let discountVoucher = 0;
    if (voucherData) {
      if (totalPrice < voucherData.minOrderValue) {
        return res.status(400).json({
          code: false,
          message: `Voucher chưa đủ điều kiện (yêu cầu đơn tối thiểu ${voucherData.minOrderValue}đ)`,
        });
      }
      if (voucherData.discountType === "percentage") {
        const percentDiscount = totalPrice * voucherData.discountValue / 100;
        discountVoucher = Math.min(percentDiscount, voucherData.maxDiscount || Infinity);
      } else {
        discountVoucher = voucherData.discountValue;
      }
    }

    let memberDiscount = 0;
    if (user && user.member) {
      const tierConfig = await Tier.findOne({ slug: user.member.toLowerCase(), deleted: false });

      if (tierConfig && totalPrice >= tierConfig.minOrderValue) {
        const discountAmount = totalPrice * (tierConfig.discountRate / 100);
        memberDiscount = Math.min(discountAmount, tierConfig.maxDiscount);
      }
    }

    const finalTotal = totalPrice - memberDiscount - discountVoucher;


    const orderCode = OrderCode(10);

    // --- FRAUD DETECTION LOGIC ---
    let isFraud = false;
    let fraudReason = "";

    const isCOD = pay === "Thanh toán khi nhận hàng" || pay === "cod";

    if (isCOD && finalTotal >= 20000000) {
        isFraud = true;
        fraudReason = "Đơn COD có giá trị lớn bất thường (> 20 triệu VNĐ).";
    }

    if (!isFraud) {
        const canceledCount = await Orders.countDocuments({ phone: phone, status: "cancel" });
        if (canceledCount >= 5) {
            isFraud = true;
            fraudReason = `Khách hàng có lịch sử hủy đơn quá nhiều (${canceledCount} đơn).`;
        }
    }

    if (!isFraud) {
        const uniqueEmails = await Orders.distinct("email", { phone: phone });
        if (uniqueEmails.length > 2) {
            isFraud = true;
            fraudReason = `Sử dụng cùng 1 số điện thoại với nhiều email khác nhau (${uniqueEmails.length} email).`;
        }
    }
    // --- END FRAUD DETECTION LOGIC ---

    const orderData = {
      code: orderCode,
      fullname,
      address,
      phone,
      email,
      voucher: voucherCode || null,
      pay,
      status: isFraud ? "suspicious" : "pending",
      products: products.map(item => ({
        productId: item.productId,
        title: item.title,
        thumbnail: item.thumbnail,
        price: item.price,
        discountPercentage: item.discountPercentage,
        quantity: item.quantity,
        finalPrice: item.price - (item.price * item.discountPercentage / 100),
        slug: item.slug
      })),
      totalPrice: totalPrice > 0 ? totalPrice : 0,
      finalPrice: finalTotal > 0 ? finalTotal : 0,
      memberDiscount: memberDiscount > 0 ? memberDiscount : 0,
      voucherDiscount: discountVoucher > 0 ? discountVoucher : 0,
    };

    const createOrder = new Orders(orderData);
    await createOrder.save();

    // Cập nhật lại số lượt sử dụng voucher nếu có
    if (voucherCode) {
      await Vouchers.updateOne(
        { code: voucherCode },
        { $inc: { usedCount: 1 } }
      );
    }

    const createNotifi = new Notification({
      title: "Bạn có đơn hàng mới",
      message: `Hệ thống ghi nhận đơn hàng mới #${createOrder.code}. Vui lòng kiểm tra và xác nhận trạng thái đơn hàng.`,
      type: "order_new",
      action_url: `/admin/orders/${createOrder.code}`,
      reference_type: "Order",
      reference_id: createOrder._id
    })

    await createNotifi.save();


    formSendMail.sendOrderConfirmation(email, orderData);


    if (user) {
      await Carts.updateOne(
        { user_id: user._id.toString() },
        { $set: { products: [] } }
      )
    }

    // Luôn bắn Socket thông báo có đơn hàng mới cho Admin (để đổ chuông báo động)
    const io = req.app.get("io");
    if (io) {
      if (isFraud) {
         io.emit("admin_direct_message", {
            message: `⚠️ [HỆ THỐNG AN NINH] Đơn hàng ${createOrder.code} vừa bị ĐÓNG BĂNG tự động vì nghi ngờ gian lận (Bom hàng). Lý do: ${fraudReason} Đề nghị Sếp hoặc bộ phận CSKH gọi điện xác minh trước khi duyệt!`,
            from: "AI Veltrix-chan (An ninh)"
         });
      }
      // Bắn socket kèm theo flag force: true để báo đây là đơn mới, front-end tự hú còi
      io.emit("admin_auto_pilot_trigger", { orderCode: createOrder.code, force: true });
    }

    // AI Auto-Pilot Trigger: Xử lý duyệt đơn tự động ngầm
    if (!isFraud) {
        const system = await System.findOne({});
        if (system && system.ai && system.ai.autoProcessOrders === true) {

          // Chạy bất đồng bộ, không cần await để khách hàng nhận được phản hồi ngay
          processOrderLogic(createOrder.code, io).then(res => {
            console.log(`[AI Auto-Pilot] Processed ${createOrder.code}:`, res);
          }).catch(err => {
            console.error(`[AI Auto-Pilot] Error on ${createOrder.code}:`, err);
          });
        }
    }

    res.status(200).json({
      code: true,
      message: `Đặt hàng thành công`,
      data: {
        discount: voucherData ? voucherData.discountValue : 0
      },
      orderReturn: createOrder
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: false,
      message: `Lỗi hệ thống: ${error.message}`,
    });
  }
};
module.exports.getDetailOrder = async (req, res) => {
  try {
    const token_client = req.cookies.token_client;
    const dedcode = await jwtHelper.verifyToken(token_client);
    const user = await Users.findOne({
      _id: dedcode.id
    }).select("-password -_id")
    const orderCode = req.params.orderCode;
    const order = await Orders.findOne({
      code: orderCode,
      email: user.email
    })

    res.status(200).json({
      code: true,
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: false,
      message: `Lỗi hệ thống: ${error.message}`,
    });
  }
};