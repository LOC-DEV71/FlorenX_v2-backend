const productPreviewHandle =  (io, socket) => {
  socket.on("product_preview", async (data) => {
    io.emit("server_return_product_preview", data)
  });
};

module.exports = productPreviewHandle;