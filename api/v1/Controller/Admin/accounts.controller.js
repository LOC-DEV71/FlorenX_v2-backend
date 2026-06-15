const Account = require("../../Models/accounts.model");
const ActivityLog = require("../../Models/activityLog.model");
const bcrypt = require("bcryptjs");
const jwtUtils = require("../../../../utils/jwt.utils");
module.exports.index = async (req, res) => {
    try {
        const find = {
            deleted: false
        };

        const sort = {};

        if (req.query.sort) {
            const [key, value] = req.query.sort.split("-");

            if (key === "fullname") {
                sort.fullname = value === "asc" ? 1 : -1;
            }
            if (key === "status") {
                find.status = value;
            }
        }

        if (Object.keys(sort).length === 0) {
            sort.position = 1;
        }

        const accounts = await Account.find(find).lean().sort(sort).select("-password")
        return res.status(200).json({
            code: true,
            accounts
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getAccountById = async (req, res) => {
    try {
        const {id} = req.params;
        const account = await Account.findOne({
            deleted: false,
            _id: id
        }).lean().select("-password")
        return res.status(200).json({
            code: true,
            account
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
            email: email,
            deleted: false
        })

        if (exitEmail) {
            return res.status(400).json({
                message: "Email đã tồn tại",
                code: false
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createAccount = new Account({ ...req.body, password: hashedPassword });

        await createAccount.save();

        return res.status(200).json({
            message: "Tạo tài khoản mới thành công",
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, ...rest } = req.body;

        const existEmail = await Account.findOne({ email: email, deleted: false });

        if (existEmail && existEmail._id.toString() !== id) {
            return res.status(400).json({
                message: "Email đã tồn tại",
                code: false
            });
        }

        const updateData = {
            email,
            ...rest
        };

        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await Account.updateOne({ _id: id }, updateData);

        return res.status(200).json({
            message: "Cập nhật tài khoản thành công",
            code: true
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        });
    }
};

// [POST] /api/v1/admin/
module.exports.changeMulti = async (req, res) => {
    try {
        const { selectId, typeChange } = req.body;
        console.log(req.body)
        switch (typeChange) {
            case "active":
                await Account.updateMany(
                    { _id: { $in: selectId } },
                    { status: "active" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "inactive":
                await Account.updateMany(
                    { _id: { $in: selectId } },
                    { status: "inactive" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "delete":
                await Account.updateMany(
                    { _id: { $in: selectId } },
                    {deleted: true}
                )
                return res.status(200).json({
                    message: "Đã xóa tài khoản quản trị thành công",
                    code: true
                })
            default:
                return;
        }
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.getActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await ActivityLog.find({ accountId: id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
            
        return res.status(200).json({
            code: true,
            logs
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        });
    }
};