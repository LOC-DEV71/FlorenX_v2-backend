const Users = require("../../Models/user.models");
const jwtHelper = require("../../../../utils/jwt.utils");
const { OAuth2Client } = require("google-auth-library");

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