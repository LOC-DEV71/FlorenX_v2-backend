const Users = require("../../Models/user.models");
const jwtHelper = require("../../../../utils/jwt.utils");
const { OAuth2Client } = require("google-auth-library");
const Cart = require("../../Models/cart.model");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ ok: false, data: "Token không hợp lệ" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await Users.findOne({ email, deleted: false });

    if (!user) {
      user = new Users({
        email,
        fullname: name,
        avatar: picture,
        password: null,
      });

      await user.save();
    }

    const tokenSystem = jwtHelper.createToken({
      id: user._id,
      type: "login",
    });


    // 1. Lấy cart hiện tại từ cookie (có thể là guest cart)
    const cartToken = req.cookies.cart;
    let guestCart = null;

    if (cartToken) {
      const decodedCart = jwtHelper.verifyToken(cartToken);
      if (decodedCart?.id && decodedCart.type === "cart") {
        guestCart = await Cart.findById(decodedCart.id);
      }
    }

    // 2. Tìm cart đã gắn với user
    let userCart = await Cart.findOne({
      user_id: user._id
    });

    // 3. Nếu có guest cart
    if (guestCart) {
      // Nếu cart trong cookie là cart guest thật sự
      if (!guestCart.user_id) {
        // Nếu user chưa có cart riêng -> gán luôn guest cart cho user
        if (!userCart) {
          guestCart.user_id = user._id;
          await guestCart.save();
          userCart = guestCart;
        } else {
          // Nếu user đã có cart riêng -> merge guest cart vào user cart
          for (const guestProduct of guestCart.products) {
            const existProduct = userCart.products.find(
              item =>
                item.product_id.toString() ===
                guestProduct.product_id.toString()
            );

            if (existProduct) {
              existProduct.quantity += guestProduct.quantity;
            } else {
              userCart.products.push({
                product_id: guestProduct.product_id,
                quantity: guestProduct.quantity
              });
            }
          }

          await userCart.save();

          // Xóa guest cart cũ sau khi merge
          await Cart.deleteOne({ _id: guestCart._id });
        }
      } 
      // Nếu cart trong cookie đã là cart của chính user này
      else if (guestCart.user_id.toString() === user._id.toString()) {
        userCart = guestCart;
      }
    }

    // 4. Nếu user chưa có cart nào thì tạo mới
    if (!userCart) {
      userCart = await Cart.create({
        user_id: user._id,
        products: []
      });
    }

    // 5. Set lại cookie cart theo cart cuối cùng của user
    const tokenCart = jwtHelper.createToken({
      id: userCart._id,
      type: "cart",
    });

    res.cookie("cart", tokenCart, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    //môi trường deploy
    // res.cookie("token_client", tokenSystem, {
    //     httpOnly: true,
    //     secure: true,        
    //     sameSite: "none",    
    //     maxAge: 7 * 24 * 60 * 60 * 1000
    // });

    res.cookie("token_client", tokenSystem, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ ok: true, data: user });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.json({ ok: false, data: error.message });
  }
};

module.exports.getMe = async (req, res) => {
  try {
    const token_client = req.cookies.token_client;
    const dedcode = jwtHelper.verifyToken(token_client);
    const user = await Users.findOne({
      _id: dedcode.id
    }).select("-password -_id")
    return res.status(200).json({
      message: `ok`,
      user,
      code: true
    })
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    })
  }
}

module.exports.logout = async (req, res) => {
  try {
    res.clearCookie("token_client");
    res.clearCookie("cart");
    return res.status(200).json({
      message: `ok`,
      code: true
    })
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    })
  }
}

module.exports.update = async (req, res) => {
  try {
    const token_client = req.cookies.token_client;
    const dedcode = jwtHelper.verifyToken(token_client);
    const exitUser = await Users.findOne({_id: dedcode.id});
    if(!exitUser){
      return res.status(400).json({
        message: `Token không hợp lệ`
      })
    }
    await Users.updateOne(
      {_id: dedcode.id},
      req.body
    )
    return res.status(200).json({
      message: `Cập nhật thông tin thành công`,
      code: true
    })
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    })
  }
}