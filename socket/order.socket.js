

const orderHandle =  (io, socket) => {
  
  socket.on("newOrder", async (data) => {
    // console.log("Kết nối socket thành công")
    io.emit("server_return_order", data)
  });
};

module.exports = orderHandle;