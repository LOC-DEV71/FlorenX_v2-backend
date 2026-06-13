const Order = require("../Models/order.model");
const ProductStock = require("../Models/product-stock.models");
const InventoryTransaction = require("../Models/InventoryTransaction.models");

// Logic thực thi Đơn hàng tự động
async function processOrderLogic(orderCode) {
    try {
        const order = await Order.findOne({ code: orderCode });
        if (!order) return { status: "error", message: `Không tìm thấy đơn hàng mã ${orderCode}` };
        if (order.status !== "pending" && order.status !== "confirmed") return { status: "error", message: `Đơn hàng đang ở trạng thái '${order.status}', không thể xuất kho` };

        // 1. Kiểm tra tồn kho trước khi xuất
        for (const prod of order.products) {
            const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
            if (!stock) {
                return { status: "error", message: `Sản phẩm '${prod.title}' không có kho nào đủ tồn kho (cần ${prod.quantity}).` };
            }
        }

        // 2. Đủ tồn kho => Trừ kho và tạo phiếu xuất
        for (const prod of order.products) {
            const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
            stock.quantity -= prod.quantity;
            await stock.save();

            await InventoryTransaction.create({
                type: "export",
                product_id: prod.productId,
                warehouse_id: stock.warehouse_id,
                quantity: prod.quantity,
                ref_id: `EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                export_date: new Date(),
                ref_name: orderCode,
                note: `AI Tự động duyệt đơn và xuất kho cho khách ${order.fullname || "Khách mua hàng"}`
            });
        }

        // 3. Đổi trạng thái đơn hàng sang vận chuyển
        order.status = "shipped";
        await order.save();

        return { status: "success", message: `Đã xác nhận, xuất kho và chuyển đơn hàng ${orderCode} sang trạng thái Vận chuyển (shipped).` };
    } catch (e) {
        return { status: "error", message: `Lỗi hệ thống: ${e.message}` };
    }
}

// Logic thực thi duyệt TẤT CẢ đơn hàng pending
async function processAllOrdersLogic() {
    try {
        const pendingOrders = await Order.find({ status: "pending" });
        if (pendingOrders.length === 0) return { status: "success", message: "Hiện không có đơn hàng nào đang chờ duyệt." };

        let successCount = 0;
        let failCount = 0;
        let failMessages = [];
        let successCodes = [];

        for (const order of pendingOrders) {
            let enoughStock = true;
            for (const prod of order.products) {
                const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
                if (!stock) {
                    enoughStock = false;
                    failMessages.push(`Đơn ${order.code} thiếu hàng (${prod.title}).`);
                    break;
                }
            }

            if (!enoughStock) {
                failCount++;
                continue;
            }

            for (const prod of order.products) {
                const stock = await ProductStock.findOne({ product_id: prod.productId, quantity: { $gte: prod.quantity } });
                stock.quantity -= prod.quantity;
                await stock.save();

                await InventoryTransaction.create({
                    type: "export",
                    product_id: prod.productId,
                    warehouse_id: stock.warehouse_id,
                    quantity: prod.quantity,
                    ref_id: `EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                    export_date: new Date(),
                    ref_name: order.code,
                    note: `AI Tự động duyệt đơn và xuất kho cho khách ${order.fullname || "Khách mua hàng"}`
                });
            }

            order.status = "shipped";
            await order.save();
            successCount++;
            successCodes.push(order.code);
        }

        let finalMsg = `Đã duyệt thành công ${successCount} đơn hàng${successCount > 0 ? ` (Mã: ${successCodes.join(", ")})` : ""}. `;
        if (failCount > 0) {
            finalMsg += `Có ${failCount} đơn thất bại do thiếu tồn kho. Chi tiết: ${failMessages.join(" ")}`;
        }
        return { status: "success", message: finalMsg };
    } catch (e) {
        return { status: "error", message: `Lỗi hệ thống: ${e.message}` };
    }
}

module.exports = {
    processOrderLogic,
    processAllOrdersLogic
};
