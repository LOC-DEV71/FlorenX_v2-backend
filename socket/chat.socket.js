const Room = require("../api/v1/Models/roomChat.model"); 
const Message = require("../api/v1/Models/message.model"); 
const Users = require("../api/v1/Models/user.models"); 
const Orders = require("../api/v1/Models/order.model"); 

const chatHandler =  (io, socket) => {
  
  socket.on("client_join_room", async (data) => {
    const { roomId } = data;
    if(!roomId) return;
    socket.join(roomId)
    if(data.sender === "user"){
      const message = await Message.find({roomId: roomId})
      io.to(roomId).emit("server_return_room_data", {message, admin: "Mèo Con Tư vấn"})
    } else{
      // Admin joins, reset unread count
      await Room.updateOne({ _id: roomId }, { unreadAdmin: 0 });
      const message = await Message.find({roomId: roomId})
      const room = await Room.findOne({_id: roomId})
      const user = await Users.findOne({_id: room.user_id}).select("fullname email member avatar phone");
      const orders = await Orders.find({email: user.email}).sort({createdAt: -1}).limit(2).select("code status finalPrice");
      io.to(roomId).emit("server_return_room_data", {message, user, orders})
    }
  });

  socket.on("client_leave_room", (data) => {
    const { roomId } = data;
    if (roomId) socket.leave(roomId);
  });

  socket.on("client_typing", async (data) => {
    if(data.sender === "user"){
      const user = await Room.findOne({
        _id: data.roomId,
        user_id: data.userId
      })
      io.to(data.roomId).emit("server_show_typing", {
        typing: data.typing,
        userId:  user.user_id
      })
    } else {
      io.to(data.roomId).emit("server_show_typing", {
        typing: data.typing,
        sender: data.sender
      })
    }
  })

  socket.on("client_send_message", async (data) => {
    const {roomId, text, sender, timestamp} = data;
    const createMessage = new Message({ 
      roomId: roomId,
      text: text,
      sender: sender
    })
    await createMessage.save();

    if (sender === "user") {
      await Room.updateOne({ _id: roomId }, { $inc: { unreadAdmin: 1 } });
    }

    io.to(roomId).emit("server_send_message", {roomId, text, sender, timestamp})
    
    // Phát event cho tất cả admin để update lại list, không gửi cho user bình thường
    if (io.onlineAdmins) {
      for (const adminSocketId of io.onlineAdmins.keys()) {
        io.to(adminSocketId).emit("admin_global_chat_update", { roomId, text, sender, timestamp });
      }
    }
  });
  
};

module.exports = chatHandler;