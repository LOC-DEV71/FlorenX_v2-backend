const Role = require("../../Models/roles.model");
module.exports.index = async (req, res) => {
    try {
        const find = {
            deleted: false
        };
        const sort = {};

        if (req.query.sort) {
            const [key, value] = req.query.sort.split("-");

            if (key === "title") {
                sort.title = value === "asc" ? 1 : -1;
            }

            if (key === "slug") {
                sort.slug = value === "asc" ? 1 : -1;
            }
        }

        const roles = await Role.find(find).sort(sort);

        const summary = {
            totalRoles: roles.length,
            activeRoles: roles.filter(item => item.status === "active").length,
            inactiveRoles: roles.filter(item => item.status === "inactive").length,
            systemRoles: roles.filter(item => item.isSystem === true).length,
        };

        return res.status(200).json({
            code: true,
            roles,
            summary
        });
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        });
    }
};

module.exports.getRoleBySlug = async (req, res) => {
    try {
        const {slug} = req.params;

        const role = await Role.findOne({
            slug: slug,
            deleted: false
        }).lean();

        return res.status(200).json({
            code: true,
            role
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.create = async (req, res) => {
    try {       
        const createRole = new Role(req.body)
        await createRole.save();

        return res.status(200).json({
            message: "Tạo tài khoản mới thành công",
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}

module.exports.update = async (req, res) => {
    try {
        const {slug} = req.params;
        await Role.updateOne(
            {slug: slug},
            req.body
        )

        return res.status(200).json({
            message: "Cập nhật tài khoản thành công",
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}


module.exports.changeMulti = async (req, res) => {
    try {
        const {selectId, typeChange} = req.body;

       switch (typeChange) {
        case "delete":
            await Role.updateMany(
                {_id: {$in: selectId}},
                {deleted: true}
            )
            return res.status(200).json({
                message: "Đã thay đổi trạng thái thành công",
                code: true
            })
       
        default:
            return;
       }
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}