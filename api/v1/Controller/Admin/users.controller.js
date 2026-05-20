const Users = require("../../Models/user.models");
const mongoose = require("mongoose");
const paginationHelper = require("../../../../helper/pagination.helper");

// [GET] /api/v1/admin/users
module.exports.index = async (req, res) => {
    try {
        const find = { deleted: false };
        const sort = {};

        if (req.query.sort) {
            const [key, value] = req.query.sort.split("-");
            if (key === "status") find.status = value;
            if (key === "fullname") sort.fullname = value === "asc" ? 1 : -1;
        }

        if (Object.keys(sort).length === 0) sort.createdAt = -1;

        if (req.query.search) {
            const regex = new RegExp(req.query.search, "i");
            find.$or = [{ fullname: regex }, { email: regex }];
        }

        const countUsers = await Users.countDocuments({ deleted: false });
        const countUsersActive = await Users.countDocuments({ status: "active", deleted: false });
        const countUsersInactive = await Users.countDocuments({ status: "inactive", deleted: false });

        const pagination = paginationHelper.pagination(countUsers, req.query, {});

        const users = await Users.aggregate([
            { $match: find },
            { $sort: sort },
            { $skip: pagination.skip },
            { $limit: pagination.limit },

            // Join orders qua email (orderSchema không có user_id)
            {
                $lookup: {
                    from: "orders",
                    localField: "email",
                    foreignField: "email",
                    as: "orders"
                }
            },

            // Join likes qua _id (clientId trong likeSchema là string nên cần $toString)
            {
                $lookup: {
                    from: "like",
                    let: { userId: { $toString: "$_id" } },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$clientId", "$$userId"] } } }
                    ],
                    as: "likes"
                }
            },

            {
                $addFields: {
                    orderCount: { $size: "$orders" },
                    totalSpend: { $sum: "$orders.totalPrice" },
                    likeCount: { $size: "$likes" }
                }
            },

            {
                $project: {
                    orders: 0,
                    likes: 0,
                    password: 0,
                    tokenUser: 0
                }
            }
        ]);

        return res.status(200).json({
            code: true,
            users,
            pagination,
            totalUsers: countUsers,
            usersActive: countUsersActive,
            usersInactive: countUsersInactive
        });
    } catch (error) {
        return res.status(400).json({ code: false, message: `Lỗi: ${error.message}` });
    }
};

// [GET] /api/v1/admin/users/:id
module.exports.detail = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await Users.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                    deleted: false
                }
            },

            // Join orders qua email
            {
                $lookup: {
                    from: "orders",
                    localField: "email",
                    foreignField: "email",
                    as: "orders"
                }
            },

            // Join likes, rồi lookup product detail cho từng like
            {
                $lookup: {
                    from: "like",
                    let: { userId: { $toString: "$_id" } },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$clientId", "$$userId"] } } },
                        {
                            $lookup: {
                                from: "products",
                                let: { pid: { $toObjectId: "$productId" } },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$_id", "$$pid"]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            title: 1,
                                            thumbnail: 1,
                                            price: 1,
                                            slug: 1,
                                            category: 1
                                        }
                                    }
                                ],
                                as: "product"
                            }
                        },
                        {
                            $unwind: {
                                path: "$product",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: "likes"
                }
            },

            {
                $addFields: {
                    orderCount: { $size: "$orders" },
                    totalSpend: { $sum: "$orders.totalPrice" },
                    likeCount: { $size: "$likes" }
                }
            },

            {
                $project: {
                    password: 0,
                    tokenUser: 0
                }
            }
        ]);



        if (!user.length) {
            return res.status(404).json({ code: false, message: "Người dùng không tồn tại" });
        }

        return res.status(200).json({ code: true, user: user[0] });
    } catch (error) {
        return res.status(400).json({ code: false, message: `Lỗi: ${error.message}` });
    }
};

// [POST] /api/v1/admin/users/change-multi
module.exports.changeMulti = async (req, res) => {
    try {
        const { selectId, typeChange } = req.body;

        if (!selectId || selectId.length === 0) {
            return res.status(400).json({ code: false, message: "Chưa chọn người dùng nào" });
        }

        switch (typeChange) {
            case "active":
                await Users.updateMany({ _id: { $in: selectId } }, { status: "active" });
                return res.status(200).json({ code: true, message: "Cập nhật trạng thái thành công" });

            case "inactive":
                await Users.updateMany({ _id: { $in: selectId } }, { status: "inactive" });
                return res.status(200).json({ code: true, message: "Cập nhật trạng thái thành công" });

            case "delete":
                await Users.updateMany({ _id: { $in: selectId } }, { deleted: true, deletedAt: new Date() });
                return res.status(200).json({ code: true, message: "Xoá người dùng thành công" });

            default:
                return res.status(400).json({ code: false, message: "Hành động không hợp lệ" });
        }
    } catch (error) {
        return res.status(400).json({ code: false, message: `Lỗi: ${error.message}` });
    }
};

// [PATCH] /api/v1/admin/users/update/:id
module.exports.update = async (req, res) => {
    try {
        const { id } = req.params;

        // Không cho phép cập nhật password hay token qua route này
        delete req.body.password;
        delete req.body.tokenUser;

        const user = await Users.findOneAndUpdate(
            { _id: id, deleted: false },
            req.body,
            { new: true }
        ).select("-password -tokenUser");

        if (!user) {
            return res.status(404).json({ code: false, message: "Người dùng không tồn tại" });
        }

        return res.status(200).json({ code: true, message: "Cập nhật thành công", user });
    } catch (error) {
        return res.status(400).json({ code: false, message: `Lỗi: ${error.message}` });
    }
};