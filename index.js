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

// Khởi tạo một danh sách Blacklist tạm thời trên RAM
const blockedIPs = new Set();

// Middleware chặn ngay lập tức nếu IP nằm trong Blacklist
app.use((req, res, next) => {
    // Với trust proxy = 1, req.ip đã là IP thật của Client (an toàn chống fake header)
    const clientIp = req.ip;
    if (blockedIPs.has(clientIp)) {
        return res.status(403).json({ 
            code: false, 
            message: "IP của bạn đã bị đưa vào Blacklist vĩnh viễn do nghi ngờ tấn công DDoS." 
        });
    }
    next();
});

// Cấu hình Rate Limit tổng (Chống Spam / DDoS cấp cơ bản)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 300, // Giới hạn 300 requests mỗi IP trong 1 phút
    message: { code: false, message: "Hệ thống đang bảo trì hoặc bạn thao tác quá nhanh. Vui lòng thử lại sau 1 phút!" },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return req.ip; 
    },
    // Nếu vượt quá 500 req -> Ném IP đó vào Blacklist
    handler: (req, res, next, options) => {
        const clientIp = req.ip;
        blockedIPs.add(clientIp);
        console.log(`[DDoS ALERT] Đã đưa IP ${clientIp} vào Blacklist!`);
        res.status(429).json(options.message);
    }
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