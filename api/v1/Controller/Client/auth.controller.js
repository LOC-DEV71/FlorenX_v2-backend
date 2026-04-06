const Users = require("../../Models/user.models");
const jwtHelper = require("../../../../utils/jwt.utils");
const { OAuth2Client } = require("google-auth-library");
const Cart = require("../../Models/cart.model");
const GeneralOtp = require("../../../../helper/generalOtp");
const formSendMail = require("../../../../helper/formSendMail");
const Otp = require("../../Models/otp.model");
const bcrypt = require("bcryptjs");

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
module.exports.logLocal = async (req, res) => {
  try {
   
    const user = await Users.findOne({
      email: req.body.email
    })

    if(!user){
      return res.status(400).json({
        code: false,
        message: "Email không tồn tại"
      })
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    
    if(!isMatch){
      return res.status(400).json({
          message: "Mật khẩu không chính xác",
          code: false
      })
    }

    const tokenSystem = jwtHelper.createToken({
      id: user._id,
      type: "login",
    });

    res.cookie("token_client", tokenSystem, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
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
    return res.json({ code: true, message: "Đăng nhập thành công" });
  } catch (error) {
    return res.status(400).json({
      message: `Lỗi: ${error}`,
      code: false
    })
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
module.exports.create = async (req, res) => {
  try {
    const otp = GeneralOtp(8);

    const expireInSeconds = 5;

    const createOtp = new Otp({
      email: req.body.email,
      otp: otp,
      type: "register",
      expireAt: new Date(Date.now() + expireInSeconds * 60 * 1000) 
    })

    createOtp.save();

    formSendMail.formSendMail(createOtp.email, createOtp.otp)

    return res.status(200).json({
      message: `Đã gửi mã otp xác nhận về email của bạn`,
      code: true
    })
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    })
  }
}
module.exports.confirm = async (req, res) => {
  try {
    const { email, otp, password, fullname } = req.body;

    const existOtp = await Otp.findOne({
      otp: otp,
      email: email,
      type: "register"
    });

    if (!existOtp) {
      return res.status(400).json({
        message: "Mã OTP không chính xác"
      });
    }

    const existUser = await Users.findOne({ email: email });

    if (existUser) {
      return res.status(400).json({
        message: "Email đã tồn tại"
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = new Users({
      fullname: fullname,
      email: email,
      password: hashPassword
    });

    await user.save();

    await Otp.deleteOne({ _id: existOtp._id });

    const tokenSystem = jwtHelper.createToken({
      id: user._id,
      type: "login",
    });

    res.cookie("token_client", tokenSystem, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      message: "Xác thực OTP và đăng nhập thành công",
      code: true
    });
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    });
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;

    if(!email){
      return res.status(400).json({
        code: false,
        message: "Vui lòng nhập email"
      })
    }

    const exitEmail = await Users.findOne({
      email: email
    })

    if(!exitEmail){
      return res.status(400).json({
        code: false,
        message: "Email không tồn tại"
      })
    }
    
    const otp = GeneralOtp(8);

    const expireInSeconds = 5;

    const createOtp = new Otp({
      email: email,
      otp: otp,
      type: "forgot",
      expireAt: new Date(Date.now() + expireInSeconds * 60 * 1000) 
    })

    createOtp.save();

    formSendMail.formSendMail(createOtp.email, createOtp.otp)
    
    return res.status(200).json({
      message: "Xác thực OTP để đổi mật khẩu",
      code: true
    });
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    });
  }
};
module.exports.forgotPasswordOtp = async (req, res) => {
  try {
    const {email, otp} = req.body;

    if(!otp){
      return res.status(400).json({
        code: false,
        message: "Vui lòng nhập OTP"
      })
    }

    const existOtp = await Otp.findOne({
      email: email,
      otp: otp
    })

    if(!existOtp){
      return res.status(400).json({
        code: false,
        message: "Mã OTP không chính xác"
      })
    }

    const user = await Users.findOne({
      email: email
    })

    const tokenSystem = jwtHelper.createToken({
      id: user._id,
      type: "login"
    })

    res.cookie("token_client", tokenSystem, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    return res.status(200).json({
      message: "Xác thực thành công",
      code: true
    });
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    });
  }
};


module.exports.resetPassword = async (req, res) => {
  try {
    const {password, repassword} = req.body;
    const tokenClient = req.cookies.token_client;
    if(!tokenClient){
      return res.status(400).json({
        message: "Token không hợp lệ, quên mật khẩu để xác thực."
      });
    }
    const dedcode = jwtHelper.verifyToken(tokenClient);

    const user = await Users.findById(dedcode.id)

    if(!user){
      return res.status(400).json({
        message: "Không tìm thấy tài khoản."
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const exitPassword = await bcrypt.compare(hashPassword, user.password);
    console.log(exitPassword)

    if(exitPassword){
      return res.status(400).json({
        message: "Không đổi mật khẩu gần đây."
      });
    }

    await Users.updateOne(
      {_id: user._id},
      {
        password: hashPassword
      }
    )
    
    return res.status(200).json({
      message: "Đổi mật khẩu thành công",
      code: true
    });
  } catch (err) {
    return res.status(400).json({
      message: `Lỗi: ${err}`
    });
  }
};