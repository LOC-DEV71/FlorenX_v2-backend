const productPreviewHandle =  (io, socket) => {
  socket.on("product_preview", async (data) => {
    data.createdAt = new Date();  
    const notification = {
      title: "Đánh giá sản phẩm",
      message: `
            <span style="font-weight: 600; color: #ff5151;">
              Người dùng
            </span>
            đã đánh
            <span style="font-weight: 600; color: #faad14;">
            ${data?.rating} ★
            </span>
            cho sản phẩm
            <span style="font-weight: 600;">
            ${data?.slug}
            </span>.
        `,
        type: "rating",
        action_url: `/admin/products/detail/${data?.slug}`,
        reference_type: "Product",
        reference_id: data?.product_id,
    };  
    io.emit("server_return_product_preview", {data, notification})
  });
};

module.exports = productPreviewHandle;