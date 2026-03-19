const Permission = require("../../Models/permission.models");
const Role = require("../../Models/roles.model");;
module.exports.index = async (req, res) => {
    try {
        const permissions = await Permission.find();
        return res.status(200).json({
            code: true,
            permissions
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
module.exports.change = async (req, res) => {
    try {
        const { role_id, permissions } = req.body;

        await Role.updateOne(
            { _id: role_id },
            {
                $set: {
                    permissions: permissions
                }
            }
        );

        return res.status(200).json({
            code: true,
            message: "Đã cập nhật phân quyền"
        });

    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        });
    }
};