const paypal = require("@paypal/checkout-server-sdk");
const Orders = require("../../Models/order.model");
const Carts = require("../../Models/cart.model");
const Users = require("../../Models/user.models");
const Vouchers = require("../../Models/vouchers.model");
const OrderCode = require("../../../../helper/generalOtp");
const formSendMail = require("../../../../helper/formSendMail");
const jwtHelper = require("../../../../utils/jwt.utils");


const environment = new paypal.core.SandboxEnvironment(
  "AVLmCQeDTY4V61Oz3EDPhSaDLkIAMEy8ldzQHa7Q5BingPpqAntPqRoI40NY-8TKbxlJrkaZad9nNb1t",
  "EMPnv9Nt9VjTU99m8uTXgsHxzTi8KN_wMTZ_VQ5VX4h3aFnwxaA4zQjU-BqEcYZJIboW2Tnnjz317eY5"
);
const client = new paypal.core.PayPalHttpClient(environment);

const createOrder = async (req, res) => {
  const { amount } = req.body;
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "USD", value: amount } }]
  });
  try {
    const order = await client.execute(request);
    res.json({ orderID: order.result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const captureOrder = async (req, res) => {
  const { orderID } = req.body;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});
  try {
    const capture = await client.execute(request);
    res.json({ status: capture.result.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createOrder, captureOrder };

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
    const discountVoucher = (() => {
      if (!voucherData) return 0;
      if (totalPrice < voucherData.minOrderValue) {
        return res.status(404).json({
          code: false,
          message: `Voucher chưa đủ điều kiện`,
        });
      }
      if (voucherData.discountType === "percentage") {
        const percentDiscount = totalPrice * voucherData.discountValue / 100;
        return Math.min(percentDiscount, voucherData.maxDiscount || Infinity)
      }

      return voucherData.discountValue;
    })();

    const memberDiscount = (() => {
      if (!user) return;
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
        default:
          return 0;
      }

      if (totalPrice < tierConfig.minOrder) return 0;
      const discountAmount = totalPrice * tierConfig.rate;
      return Math.min(discountAmount, tierConfig.max);
    })();

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
        finalPrice: item.price - (item.price * item.discountPercentage / 100)
      })),
      totalPrice: totalPrice > 0 ? totalPrice : 0, 
      finalPrice: finalTotal > 0 ? finalTotal : 0,
      memberDiscount: memberDiscount > 0 ? memberDiscount : 0,
      voucherDiscount: discountVoucher > 0 ? discountVoucher : 0,
    };

    const createOrder = new Orders(orderData);
    await createOrder.save();

    await Carts.updateOne(
      {user_id: user._id.toString()},
      {$set: {products: []}}
    )

    formSendMail.sendOrderConfirmation(email, orderData);


    res.status(200).json({
      code: true,
      message: `Đặt hàng thành công`,
      data: {
        discount: voucherData ? voucherData.discountValue : 0
      },
      orderCode: createOrder.code
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
    const dedcode = jwtHelper.verifyToken(token_client);
    const user = await Users.findOne({
      _id: dedcode.id
    }).select("-password -_id")
    const orderCode = req.params.orderCode;
    const order = await Orders.findOne({
      code: orderCode,
      email: user.email
    })
    console.log(order)

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