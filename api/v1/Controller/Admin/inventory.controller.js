const mongoose = require("mongoose");
const Warehouse = require("../../Models/warehouse.models");
const InventoryTransaction = require("../../Models/InventoryTransaction.models");
const ProductStock = require("../../Models/product-stock.models");

module.exports.inventoryImport = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { warehouse, code, items } = req.body;

        if (!warehouse || !items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                code: false,
                message: "Thiếu dữ liệu nhập kho",
            });
        }

        const warehouseInfo = await Warehouse.findById(warehouse).session(session);
        if (!warehouseInfo) {
            await session.abortTransaction();
            return res.status(404).json({
                code: false,
                message: "Kho không tồn tại",
            });
        }

        for (const item of items) {
            const { productId, quantity, importPrice } = item;

            if (!productId || !quantity) {
                await session.abortTransaction();
                return res.status(400).json({
                    code: false,
                    message: "Dữ liệu sản phẩm không hợp lệ",
                });
            }

            const qty = Number(quantity) || 0;

            let stock = await ProductStock.findOne({
                product_id: productId,
                warehouse_id: warehouse,
            }).session(session);

            if (stock) {
                stock.quantity += qty;
                await stock.save({ session });
            } else {
                await ProductStock.create(
                    [
                        {
                            product_id: productId,
                            warehouse_id: warehouse,
                            quantity: qty,
                        },
                    ],
                    { session }
                );
            }

            await InventoryTransaction.create(
                [
                    {
                        type: "import",
                        product_id: productId,
                        warehouse_id: warehouse,
                        quantity: qty,
                        ref_id: code,
                    },
                ],
                { session }
            );
        }

        await session.commitTransaction();

        return res.status(200).json({
            code: true,
            message: "Nhập kho thành công",
        });
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({
            code: false,
            message: `Lỗi: ${error.message}`,
        });
    } finally {
        session.endSession();
    }
};