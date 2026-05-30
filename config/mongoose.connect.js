const mongoose = require("mongoose");

let isConnected = false; // Biến lưu trạng thái kết nối

module.exports.connect = async () => {
    if (isConnected) {
        console.log("Mongoose đang sử dụng lại kết nối cũ (Serverless cache)");
        return;
    }

    if (!process.env.MONGO_URI) {
        console.error("Lỗi: Thiếu MONGO_URI trong biến môi trường!");
        return;
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        isConnected = db.connections[0].readyState;
        console.log("connect mongoose success");
    } catch (error) {
        console.error(error);
    }
}
