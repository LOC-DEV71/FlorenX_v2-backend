const chatHandler = require("./chat.socket");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    console.log("Mới có người kết nối:", socket.id);

    chatHandler(io, socket); 

    socket.on("disconnect", () => {
      console.log("Người dùng đã thoát:", socket.id);
    });
  });
};