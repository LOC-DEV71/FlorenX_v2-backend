const Cart = require("../../Models/cart.model");
const Product = require("../../Models/products.models");
const jwtUtils = require("../../../../utils/jwt.utils");
const Users = require("../../Models/user.models");

module.exports.addToCart = async (req, res) => {
  try {
    // Lấy productId từ body
    const { productId } = req.body;
    const quantity = 1;

    // Validate cơ bản
    if (!productId) {
      return res.status(400).json({
        code: false,
        message: "Thiếu productId"
      });
    }

    // Lấy token cart từ cookie
    const cartToken = req.cookies.cart;

    let cartDoc = null;

    // 1. Ưu tiên tìm cart theo cookie cart
    if (cartToken) {
      const decodedCart = jwtUtils.verifyToken(cartToken);

      // Check đúng token cart mới lấy
      if (decodedCart?.id && decodedCart.type === "cart") {
        cartDoc = await Cart.findById(decodedCart.id);
      }
    }

    // 2. Nếu chưa có cart thì check user đăng nhập
    if (!cartDoc) {
      const clientToken = req.cookies.token_client;
      let user = null;

      if (clientToken) {
        const decodedUser = jwtUtils.verifyToken(clientToken);

        // Check đúng token login mới lấy user
        if (decodedUser?.id && decodedUser.type === "login") {
          user = await Users.findById(decodedUser.id);
        }
      }

      // 3. Nếu có user thì tìm cart cũ của user trước
      // tránh việc 1 user bị tạo nhiều cart
      if (user) {
        cartDoc = await Cart.findOne({ user_id: user._id });
      }

      // 4. Nếu vẫn chưa có cart thì mới tạo cart mới
      if (!cartDoc) {
        cartDoc = await Cart.create({
          user_id: user ? user._id : null,
          products: []
        });
      }
    }

    // 5. Tạo lại token cart và lưu vào cookie
    // để những lần sau client luôn mang đúng cart hiện tại
    const tokenCart = jwtUtils.createToken({
      id: cartDoc._id,
      type: "cart"
    });

    res.cookie("cart", tokenCart, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 6. Kiểm tra sản phẩm đã tồn tại trong cart chưa
    const existCart = await Cart.findOne({
      _id: cartDoc._id,
      "products.product_id": productId
    });

    if (existCart) {
      // Nếu sản phẩm đã có trong cart thì tăng quantity lên 1
      await Cart.updateOne(
        {
          _id: cartDoc._id,
          "products.product_id": productId
        },
        {
          $inc: { "products.$.quantity": quantity }
        }
      );
    } else {
      // Nếu sản phẩm chưa có thì thêm mới vào mảng products
      await Cart.updateOne(
        { _id: cartDoc._id },
        {
          $push: {
            products: {
              product_id: productId,
              quantity: quantity
            }
          }
        }
      );
    }

    return res.status(200).json({
      code: true,
      message: "Đã thêm vào giỏ hàng"
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};

module.exports.getCart = async (req, res) => {
  try {
    const tokenCart = req.cookies.cart;
    const dedcode = jwtUtils.verifyToken(tokenCart);

    let cart = null;

    if (dedcode) {
      cart = await Cart.findById(dedcode.id);
    }

    if (!cart) {
      return res.status(404).json({
        code: false,
        message: "Cart không tồn tại"
      });
    }

    // Lấy productIds
    const productIds = cart.products.map(item => item.product_id);

    // Lấy danh sách product
    const products = await Product.find({
      _id: { $in: productIds }
    });

    // Gộp quantity vào product
    const result = products.map(product => {
      const item = cart.products.find(
        p => p.product_id.toString() === product._id.toString()
      );

      return {
        ...product.toObject(),
        quantity: item.quantity
      };
    });

    return res.status(200).json({
      code: true,
      products: result
    });

  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};
module.exports.updateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const tokenCart = req.cookies.cart;

    if (!tokenCart) {
      return res.status(401).json({
        code: false,
        message: "Không tìm thấy token giỏ hàng"
      });
    }

    const decoded = jwtUtils.verifyToken(tokenCart);

    if (!decoded) {
      return res.status(401).json({
        code: false,
        message: "Token không hợp lệ"
      });
    }

    const cart = await Cart.findById(decoded.id);

    if (!cart) {
      return res.status(404).json({
        code: false,
        message: "Không tìm thấy giỏ hàng"
      });
    }

    // Nếu quantity = 1 và user bấm giảm/xóa thì xóa sản phẩm khỏi mảng products
    if (quantity < 1) {
      await Cart.updateOne(
        { _id: cart._id },
        {
          $pull: {
            products: { product_id: productId }
          }
        }
      );

      return res.status(200).json({
        code: true,
        reload: true,
        message: "Đã xóa sản phẩm khỏi giỏ hàng"
      });
    }

    // Cập nhật số lượng sản phẩm
    const result = await Cart.updateOne(
      {
        _id: cart._id,
        "products.product_id": productId
      },
      {
        $set: {
          "products.$.quantity": quantity
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        code: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng"
      });
    }

    return res.status(200).json({
      code: true,
      reload: false,
      message: "Cập nhật số lượng thành công"
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};