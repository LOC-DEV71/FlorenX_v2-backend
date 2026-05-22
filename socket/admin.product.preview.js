const adminProductPreviewHandle =  (io, socket) => {
  socket.on("admin_product_preview", async (data) => {
    data.server_return.createdAt = new Date();  
    
    io.emit("server_return_admin_product_preview", data)
  });
};

module.exports = adminProductPreviewHandle;