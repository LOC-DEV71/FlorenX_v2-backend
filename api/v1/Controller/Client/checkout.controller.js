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
    }

    const user = await Users.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        code: false,
        message: `Người dùng không tồn tại`,
      });
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
      let tierConfig = null;
      switch (user.member) {
        case "diamond":
          tierConfig = { rate: 0.15, max: 5000000, minOrder: 10000000 };
          break;
        case "gold":
          tierConfig = { rate: 0.08, max: 3000000, minOrder: 10000000 };
          break;
        case "silver":
          tierConfig = { rate: 0.06, max: 2000000, minOrder: 10000000 };
          break;
        case "bronze":
          tierConfig = { rate: 0.05, max: 1000000, minOrder: 10000000 };
          break;
      }

      if (tierConfig && totalPrice >= tierConfig.minOrder) {
        const discountAmount = totalPrice * tierConfig.rate;
        memberDiscount = Math.min(discountAmount, tierConfig.max);
      }
    }

    const finalTotal = totalPrice - memberDiscount - discountVoucher;


    const orderCode = OrderCode(10);


    const orderData = {
      code: orderCode,
      fullname,
      address,
      phone,
      email,
      voucher: voucherCode || null,
      pay,
      status: "pending",
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


    await Carts.updateOne(
      { user_id: user._id.toString() },
      { $set: { products: [] } }
    )

    // AI Auto-Pilot Trigger: Xử lý duyệt đơn tự động ngầm
    const system = await System.findOne({});
    if (system && system.ai && system.ai.autoProcessOrders === true) {
      // Bắn Socket kích hoạt hiệu ứng Auto-Pilot trên UI Admin
      const io = req.app.get("io");
      if (io) {
        io.emit("admin_auto_pilot_trigger", { orderCode: createOrder.code });
      }

      // Chạy bất đồng bộ, không cần await để khách hàng nhận được phản hồi ngay
      processOrderLogic(createOrder.code).then(res => {
        console.log(`[AI Auto-Pilot] Processed ${createOrder.code}:`, res);
      }).catch(err => {
        console.error(`[AI Auto-Pilot] Error on ${createOrder.code}:`, err);
      });
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