const chatHandler = require("./chat.socket");
const orderHandle = require("./order.socket");
const productPreviewHandle = require("./product.preview");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    // console.log("Mới có người kết nối:", socket.id);

    chatHandler(io, socket); 
    orderHandle(io, socket); 
    productPreviewHandle(io, socket); 

    socket.on("disconnect", () => {
      // console.log("Người dùng đã thoát:", socket.id);
    });
  });
};