const InventoryAudit = require("../../Models/inventoryAudit.models");
const Pagination = require("../../../../helper/pagination.helper");
module.exports.createInventoryAudit = async (req, res) => {
    try {
        const inventoryAudit = new InventoryAudit(req.body);
        await inventoryAudit.save();
        return res.status(200).json({
            code: true,
            message: "Đã lưu thành công đơn kiểm"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getList = async (req, res) => {
    try {
        const search = req.query.search;
        const sort = req.query.sort;

        const match = {};
        const sortObj = {};

        if (search) {
            match.code = {
                $regex: search,
                $options: "i"
            };
        }

        if (sort === "new") {
            sortObj.createdAt = -1;
        } else if (sort === "old") {
            sortObj.createdAt = 1;
        }
        const countAudit = await InventoryAudit.countDocuments();
        const pagination = Pagination.pagination(countAudit, req.query)
        const audits = await InventoryAudit.aggregate([
            { $match: match },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            // 1. JOIN bảng warehouses vào
            {
                $lookup: {
                    from: "warehouses",          // tên collection muốn join
                    localField: "warehouse_id",  // field ở bảng hiện tại
                    foreignField: "_id",         // field bên bảng warehouses
                    as: "warehouse"              // tên field mới sau khi join (luôn là array)
                }
            },

            // 2. Bóc array warehouse thành object
            {
                $unwind: {
                    path: "$warehouse",           // field cần bóc
                    preserveNullAndEmptyArrays: true
                    // nếu không có warehouse vẫn giữ document (tránh bị mất data)
                }
            },

            // 3. JOIN tất cả product liên quan tới items.product_id
            {
                $lookup: {
                    from: "products",             // collection products
                    localField: "items.product_id", // tất cả product_id trong mảng items
                    foreignField: "_id",          // so sánh với _id bên products
                    as: "product_docs"            // lưu tạm tất cả product tìm được
                }
            },

            // 4. Transform lại field items
            {
                $addFields: {
                    items: {
                        $map: {
                            input: "$items",  // duyệt từng phần tử trong mảng items
                            as: "item",       // đặt tên biến là item
                            in: {
                                // giữ lại các field cũ
                                system_qty: "$$item.system_qty",
                                actual_qty: "$$item.actual_qty",
                                diff_qty: "$$item.diff_qty",
                                status: "$$item.status",

                                // thêm field product vào từng item
                                product: {
                                    $let: {
                                        vars: {
                                            p: {
                                                // lấy product tương ứng với product_id
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$product_docs", // list product đã join
                                                            as: "prod",
                                                            cond: {
                                                                // tìm product có _id = item.product_id
                                                                $eq: ["$$prod._id", "$$item.product_id"]
                                                            }
                                                        }
                                                    },
                                                    0 // lấy phần tử đầu tiên (vì chỉ có 1 product match)
                                                ]
                                            }
                                        },
                                        in: {
                                            // chỉ lấy field cần thiết từ product
                                            _id: "$$p._id",
                                            title: "$$p.title",
                                            thumbnail: "$$p.thumbnail",
                                            slug: "$$p.slug"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            // 5. Chọn lại field trả về (giống select)
            {
                $project: {
                    code: 1,          // giữ lại code
                    audit_date: 1,
                    confirmed: 1,
                    createdAt: 1,
                    created_by: 1,

                    // reshape warehouse
                    warehouse: {
                        _id: "$warehouse._id",
                        name: "$warehouse.name"
                    },

                    items: 1,         // giữ items sau khi đã map
                    // product_docs sẽ bị loại bỏ (vì không khai báo)
                }
            },

            // 6. Sắp xếp theo thời gian tạo mới nhất
            {
                $sort: Object.keys(sortObj).length ? sortObj : { createdAt: -1 }
            }

        ]);

        return res.status(200).json({
            code: true,
            audits,
            pagination
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getDetail = async (req, res) => {
    try {
        const code = req.params.code;
        const [audit = null] = await InventoryAudit.aggregate([
            { $match: { code } },
            {
                $lookup: {
                    from: "warehouses",
                    localField: "warehouse_id",
                    foreignField: "_id",
                    as: "warehouse"
                }
            },

            {
                $unwind: {
                    path: "$warehouse",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product_id",
                    foreignField: "_id",
                    as: "product_docs"
                }
            },

            {
                $addFields: {
                    items: {
                        $map: {
                            input: "$items",
                            as: "item",
                            in: {
                                system_qty: "$$item.system_qty",
                                actual_qty: "$$item.actual_qty",
                                diff_qty: "$$item.diff_qty",
                                status: "$$item.status",
                                product: {
                                    $let: {
                                        vars: {
                                            p: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$product_docs",
                                                            as: "prod",
                                                            cond: {
                                                                $eq: ["$$prod._id", "$$item.product_id"]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            _id: "$$p._id",
                                            title: "$$p.title",
                                            thumbnail: "$$p.thumbnail",
                                            slug: "$$p.slug"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            {
                $project: {
                    code: 1,
                    audit_date: 1,
                    confirmed: 1,
                    createdAt: 1,
                    created_by: 1,
                    warehouse: {
                        _id: "$warehouse._id",
                        name: "$warehouse.name"
                    },
                    items: 1
                }
            },

            { $limit: 1 }
        ])


        return res.status(200).json({
            code: true,
            audit
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}