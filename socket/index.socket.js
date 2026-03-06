module.exports = (io) => {
  io.on("connection", async (socket) => {
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};