require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const routes = require("./api/v1/Routes/index.routes");
const dataBase = require("./config/mongoose.connect");

const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
    origin: [process.env.CONNECT_FE],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cho phép đọc cookie
app.use(cookieParser());

// Trust proxy (cần thiết nếu deploy qua Vercel, Nginx, Heroku...)
app.set('trust proxy', 1);

// Cấu hình Rate Limit tổng (Chống Spam / DDoS cấp cơ bản)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 500, // Giới hạn 500 requests mỗi IP trong 15 phút
    message: { code: false, message: "Hệ thống đang bảo trì hoặc bạn thao tác quá nhanh. Vui lòng thử lại sau 15 phút!" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Áp dụng Rate Limit cho tất cả các route bắt đầu bằng /api/
app.use("/api/", apiLimiter);

dataBase.connect();
routes(app);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [process.env.CONNECT_FE],
        credentials: true
    }
});

app.set("io", io);

require("./socket/index.socket")(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;