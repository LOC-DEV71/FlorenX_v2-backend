

const orderHandle =  (io, socket) => {
  
  socket.on("newOrder", async (data) => {
    // console.log("Kết nối socket thành công")
    const notification = {
      title: "Bạn có đơn hàng mới",
      message: `Hệ thống ghi nhận đơn hàng mới #${data.order.code}. Vui lòng kiểm tra và xác nhận trạng thái đơn hàng.`,
      type: "order_new",
      action_url: `/admin/orders/${data.order.code}`,
      reference_type: "Order",
      reference_id: data.order._id,
      is_read: false,
      createdAt: new Date()
    }
    io.emit("server_return_order", {data, notification})
  });
};

module.exports = orderHandle;