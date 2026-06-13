const mongoose = require("mongoose");
const Users = require("../../Models/user.models");
const RoomChat = require("../../Models/roomChat.model");
const jwtHelper = require("../../../../utils/jwt.utils");
const { OAuth2Client } = require("google-auth-library");
const Cart = require("../../Models/cart.model");
const GeneralOtp = require("../../../../helper/generalOtp");
const formSendMail = require("../../../../helper/formSendMail");
const Otp = require("../../Models/otp.model");
const bcrypt = require("bcryptjs");
const System = require("../../Models/system.model");

// --- HELPER FUNCTION: TẠO ROOM CHAT ---
const handleCreateRoom = async (userId) => {
  try {
    const existRoom = await RoomChat.findOne({ user_id: userId });
    if (!existRoom) {
      const newRoom = new RoomChat({
        user_id: userId,
        admin_ids: []
      });
      await newRoom.save();
    }
  } catch (err) {
    console.error("Lỗi tạo RoomChat:", err);
  }
};

module.exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ ok: false, data: "Token không hợp lệ" });
    }

    const systemConfig = await System.findOne({});
    const googleClientId = systemConfig?.iam?.googleClientId;
    const googleStatus = systemConfig?.iam?.googleStatus;
    const jwtExpiresInDays = systemConfig?.iam?.jwtExpiresIn || 7;
    const maxAgeMs = jwtExpiresInDays * 24 * 60 * 60 * 1000;

    if (!googleStatus || !googleClientId) {
      return res.json({ ok: false, data: "Tính năng đăng nhập bằng Google hiện đang bị tắt hoặc chưa được cấu hình." });
    }

    const client = new OAuth2Client(googleClientId);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    const exitStatusUsers = await Users.findOne({
      email: email
    })

    if(exitStatusUsers?.status === "inactive"){
      return res.status(400).json({
        message: "Tài khoản đang bị khóa",
        code: false
      })
    }

    let user = await Users.findOne({ email, deleted: false });


    if (!user) {
      user = new Users({
        email,
        fullname: name,
        avatar: picture,
        password: null,
      });
      await user.save();
      
      // TẠO ROOM CHAT CHO USER MỚI ĐĂNG NHẬP GG LẦN ĐẦU
      await handleCreateRoom(user._id);
    }

    const tokenSystem = await jwtHelper.createToken({
      id: user._id,
      email: user.email,
      type: "login",
    });

    // 1. Lấy cart hiện tại từ cookie
    const cartToken = req.cookies.cart;
    let guestCart = null;

    if (cartToken) {
      const decodedCart = await jwtHelper.verifyToken(cartToken);
      if (decodedCart?.id && decodedCart.type === "cart") {
        guestCart = await Cart.findById(decodedCart.id);
      }
    }

    // 2. Tìm cart đã gắn với user
    let userCart = await Cart.findOne({ user_id: user._id });

    // 3. Nếu có guest cart -> Tiến hành merge
    if (guestCart) {
      if (!guestCart.user_id) {
        if (!userCart) {
          guestCart.user_id = user._id;
          await guestCart.save();
          userCart = guestCart;
        } else {
          for (const guestProduct of guestCart.products) {
            const existProduct = userCart.products.find(
              item => item.product_id.toString() === guestProduct.product_id.toString()
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
          await Cart.deleteOne({ _id: guestCart._id });
        }
      } 
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

    // 5. Set cookies
    const tokenCart = await jwtHelper.createToken({ id: userCart._id, type: "cart" });

    res.cookie("cart", tokenCart, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });

    res.cookie("token_client", tokenSystem, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });

    return res.json({ ok: true, data: user });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.json({ ok: false, data: error.message });
  }
};

module.exports.logLocal = async (req, res) => {
  try {
    const user = await Users.findOne({ email: req.body.email });

    if(!user){
      return res.status(400).json({ code: false, message: "Email không tồn tại" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    
    if(!isMatch){
      return res.status(400).json({ message: "Mật khẩu không chính xác", code: false });
    }

    const tokenSystem = await jwtHelper.createToken({ id: user._id, email: user.email, type: "login" });

    const systemConfig = await System.findOne({});
    const maxAgeMs = (systemConfig?.iam?.jwtExpiresIn || 7) * 24 * 60 * 60 * 1000;

    res.cookie("token_client", tokenSystem, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });

    // --- LOGIC CART GIỮ NGUYÊN ---
    const cartToken = req.cookies.cart;
    let guestCart = null;
    if (cartToken) {
      const decodedCart = await jwtHelper.verifyToken(cartToken);
      if (decodedCart?.id && decodedCart.type === "cart") {
        guestCart = await Cart.findById(decodedCart.id);
      }
    }
    let userCart = await Cart.findOne({ user_id: user._id });
    if (guestCart) {
      if (!guestCart.user_id) {
        if (!userCart) {
          guestCart.user_id = user._id;
          await guestCart.save();
          userCart = guestCart;
        } else {
          for (const guestProduct of guestCart.products) {
            const existProduct = userCart.products.find(item => item.product_id.toString() === guestProduct.product_id.toString());
            if (existProduct) { existProduct.quantity += guestProduct.quantity; } 
            else { userCart.products.push({ product_id: guestProduct.product_id, quantity: guestProduct.quantity }); }
          }
          await userCart.save();
          await Cart.deleteOne({ _id: guestCart._id });
        }
      } else if (guestCart.user_id.toString() === user._id.toString()) { userCart = guestCart; }
    }
    if (!userCart) { userCart = await Cart.create({ user_id: user._id, products: [] }); }

    const tokenCart = await jwtHelper.createToken({ id: userCart._id, type: "cart" });
    res.cookie("cart", tokenCart, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });

    return res.json({ code: true, message: "Đăng nhập thành công" });
  } catch (error) {
    return res.status(400).json({ message: `Lỗi: ${error}`, code: false });
  }
};

module.exports.getMe = async (req, res) => {
  try {
    const token_client = req.cookies.token_client;
    const decode = await jwtHelper.verifyToken(token_client);
    
    // Tìm user và chuyển sang object thuần (lean) để dễ thêm field
    const user = await Users.findOne({ _id: decode.id }).select("-password").lean();
    
    if (!user) {
      return res.status(400).json({ message: "Không tìm thấy user", code: false });
    }

    // LẤY ROOM CHAT ID TRẢ VỀ LUÔN
    const roomChat = await RoomChat.findOne({ user_id: decode.id });

    return res.status(200).json({
      message: `ok`,
      user: {
        ...user,
        room_chat_id: roomChat ? roomChat._id : null
      },
      code: true
    });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.clearCookie("token_client");
    res.clearCookie("cart");
    return res.status(200).json({ message: `ok`, code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.update = async (req, res) => {
  try {
    const token_client = req.cookies.token_client;
    const decode = await jwtHelper.verifyToken(token_client);
    const exitUser = await Users.findOne({_id: decode.id});
    if(!exitUser){
      return res.status(400).json({ message: `Token không hợp lệ` });
    }
    await Users.updateOne({_id: decode.id}, req.body);
    return res.status(200).json({ message: `Cập nhật thông tin thành công`, code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.create = async (req, res) => {
  try {
    const otp = GeneralOtp(8);
    const expireInSeconds = 5;
    const createOtp = new Otp({
      email: req.body.email,
      otp: otp,
      type: "register",
      expireAt: new Date(Date.now() + expireInSeconds * 60 * 1000) 
    });
    await createOtp.save();
    formSendMail.formSendMail(createOtp.email, createOtp.otp);
    return res.status(200).json({ message: `Đã gửi mã otp xác nhận về email của bạn`, code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.confirm = async (req, res) => {
  try {
    const { email, otp, password, fullname } = req.body;

    const existOtp = await Otp.findOne({ otp, email, type: "register" });
    if (!existOtp) return res.status(400).json({ message: "Mã OTP không chính xác" });

    const existUser = await Users.findOne({ email });
    if (existUser) return res.status(400).json({ message: "Email đã tồn tại" });

    const hashPassword = await bcrypt.hash(password, 10);
    const user = new Users({ fullname, email, password: hashPassword });
    await user.save();

    // TẠO ROOM CHAT KHI ĐĂNG KÝ THÀNH CÔNG
    await handleCreateRoom(user._id);

    await Otp.deleteOne({ _id: existOtp._id });

    const tokenSystem = await jwtHelper.createToken({ id: user._id, type: "login" });

    const systemConfig = await System.findOne({});
    const maxAgeMs = (systemConfig?.iam?.jwtExpiresIn || 7) * 24 * 60 * 60 * 1000;

    res.cookie("token_client", tokenSystem, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });

    return res.status(200).json({ message: "Xác thực OTP và đăng nhập thành công", code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    if(!email) return res.status(400).json({ code: false, message: "Vui lòng nhập email" });

    const exitEmail = await Users.findOne({ email });
    if(!exitEmail) return res.status(400).json({ code: false, message: "Email không tồn tại" });
    
    const otp = GeneralOtp(8);
    const expireInSeconds = 5;
    const createOtp = new Otp({
      email, otp, type: "forgot",
      expireAt: new Date(Date.now() + expireInSeconds * 60 * 1000) 
    });
    await createOtp.save();
    formSendMail.formSendMail(createOtp.email, createOtp.otp);
    
    return res.status(200).json({ message: "Xác thực OTP để đổi mật khẩu", code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.forgotPasswordOtp = async (req, res) => {
  try {
    const {email, otp} = req.body;
    if(!otp) return res.status(400).json({ code: false, message: "Vui lòng nhập OTP" });

    const existOtp = await Otp.findOne({ email, otp });
    if(!existOtp) return res.status(400).json({ code: false, message: "Mã OTP không chính xác" });

    const user = await Users.findOne({ email });
    const tokenSystem = await jwtHelper.createToken({ id: user._id, type: "login" });

    const systemConfig = await System.findOne({});
    const maxAgeMs = (systemConfig?.iam?.jwtExpiresIn || 7) * 24 * 60 * 60 * 1000;

    res.cookie("token_client", tokenSystem, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: maxAgeMs
    });
    
    return res.status(200).json({ message: "Xác thực thành công", code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const {password} = req.body;
    const tokenClient = req.cookies.token_client;
    if(!tokenClient) return res.status(400).json({ message: "Token không hợp lệ" });

    const decode = await jwtHelper.verifyToken(tokenClient);
    const user = await Users.findById(decode.id);
    if(!user) return res.status(400).json({ message: "Không tìm thấy tài khoản." });

    const hashPassword = await bcrypt.hash(password, 10);
    await Users.updateOne({_id: user._id}, { password: hashPassword });
    
    return res.status(200).json({ message: "Đổi mật khẩu thành công", code: true });
  } catch (err) {
    return res.status(400).json({ message: `Lỗi: ${err}` });
  }
};