const mongoose = require("mongoose");
const Warehouse = require("../../Models/warehouse.models");
const InventoryTransaction = require("../../Models/InventoryTransaction.models");
const ProductStock = require("../../Models/product-stock.models");
const Pagination = require("../../../../helper/pagination.helper");
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
      const price = Number(importPrice) || 0;

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
            import_price: price,
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
module.exports.inventoryExport = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { warehouse_id, ref_code, export_date, customer_name, note, items } = req.body;

    if (!warehouse_id || !items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        code: false,
        message: "Thiếu dữ liệu xuất kho",
      });
    }

    const warehouseInfo = await Warehouse.findById(warehouse_id).session(session);
    if (!warehouseInfo) {
      await session.abortTransaction();
      return res.status(404).json({
        code: false,
        message: "Kho không tồn tại",
      });
    }

    for (const item of items) {
      const { product_id, stock } = item;

      if (!product_id || !stock) {
        await session.abortTransaction();
        return res.status(400).json({
          code: false,
          message: "Dữ liệu sản phẩm không hợp lệ",
        });
      }

      const qty = Number(stock) || 0;

      if (qty <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          code: false,
          message: "Số lượng xuất phải lớn hơn 0",
        });
      }

      const productStock = await ProductStock.findOne({
        product_id,
        warehouse_id,
      }).session(session);

      if (!productStock) {
        await session.abortTransaction();
        return res.status(404).json({
          code: false,
          message: "Sản phẩm không có tồn kho trong kho này",
        });
      }

      if (productStock.quantity < qty) {
        await session.abortTransaction();
        return res.status(400).json({
          code: false,
          message: "Số lượng xuất vượt quá tồn kho",
        });
      }

      productStock.quantity -= qty;
      await productStock.save({ session });

      await InventoryTransaction.create(
        [
          {
            type: "export",
            product_id,
            warehouse_id,
            quantity: qty,
            ref_id: ref_code,
            export_date: export_date || new Date(),
            ref_name: customer_name || "",
            note: note || "",
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(200).json({
      code: true,
      message: "Xuất kho thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      code: false,
      message: `Lỗi: ${error.message}`,
    });
  } finally {
    session.endSession();
  }
};

module.exports.getListInventoryImport = async (req, res) => {
  try {
    const countInventory = await InventoryTransaction.countDocuments({
      type: "import"
    });

    const find = {
      type: "import"
    }



    if (req.query.warehouse) {
      find.warehouse_id = new mongoose.Types.ObjectId(req.query.warehouse);
    }

    let sort = { createdAt: -1 };

    if (req.query.import_price) {
      sort = {
        import_price: req.query.import_price === "low" ? 1 : -1
      };
    }

    if (req.query.sort === "newest") {
      sort = {
        createdAt: -1
      };
    } else if (req.query.sort === "oldest") {
      sort = {
        createdAt: 1
      };
    }

    if (req.query.sort === "quantity-asc" || req.query.sort === "quantity-desc") {
      const [key, value] = req.query.sort.split("-");
      sort = {
        quantity: value === "asc" ? 1 : -1
      }
    }

    const search = req.query.search;
    if (search) {
      find.ref_id = {
        $regex: search,
        $options: "i"
      };
    }

    const pagination = Pagination.pagination(countInventory, req.query);

    const data = await InventoryTransaction.aggregate([
      {
        $match: {
          ...find
        }
      },
      {
        $sort: { ...sort }
      },
      {
        $skip: pagination.skip
      },
      {
        $limit: pagination.limit
      },

      // join Product
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true
        }
      },

      // join Warehouse
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
        $project: {
          _id: 1,
          quantity: 1,
          ref_id: 1,
          createdAt: 1,
          import_price: 1,
          "product.title": 1,
          "product.slug": 1,
          "product.thumbnail": 1,
          "warehouse.name": 1
        }
      }
    ]);

    return res.status(200).json({
      code: true,
      message: "Lấy danh sách nhập kho thành công",
      data,
      pagination
    });
  } catch (error) {
    return res.status(500).json({
      code: false,
      message: `Lỗi: ${error.message}`,
    });
  }
};
module.exports.getListInventoryExport = async (req, res) => {
  try {
    const countInventory = await InventoryTransaction.countDocuments({
      type: "export"
    });

    const pagination = Pagination.pagination(countInventory, req.query);

    const data = await InventoryTransaction.aggregate([
      {
        $match: { type: "export" }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: pagination.skip
      },
      {
        $limit: pagination.limit
      },

      // join Product
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true
        }
      },

      // join Warehouse
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
        $project: {
          _id: 1,
          quantity: 1,
          ref_id: 1,
          createdAt: 1,
          import_price: 1,
          ref_name: 1,
          "product.title": 1,
          "product.slug": 1,
          "product.thumbnail": 1,
          "warehouse.name": 1
        }
      }
    ]);

    return res.status(200).json({
      code: true,
      message: "Lấy danh sách nhập kho thành công",
      data,
      pagination
    });
  } catch (error) {
    return res.status(500).json({
      code: false,
      message: `Lỗi: ${error.message}`,
    });
  }
};