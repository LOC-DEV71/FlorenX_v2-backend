const Account = require("../../Models/accounts.model");
const bcrypt = require("bcryptjs");
const jwtUtils = require("../../../../utils/jwt.utils");
module.exports.index = async (req, res) => {
    try {
        const accounts = await Account.find({
            deleted: false
        }).lean().select("-password")
        return res.status(200).json({
            message: "OK",
            accounts
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}

module.exports.create = async (req, res) => {
    try {
        const { email, password } = req.body;

        const exitEmail = await Account.findOne({
            email: email
        })

        if (exitEmail) {
            return res.status(200).json({
                message: "Email đã tồn tại"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createAccount = new Account({ ...req.body, password: hashedPassword });

        await createAccount.save();


        const token = jwtUtils.createToken({
            id: createAccount._id,
            role: createAccount.role_slug
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Tạo tài khoản mới thành công"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}