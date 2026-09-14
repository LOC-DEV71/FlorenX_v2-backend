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

// Trust proxy (cần thiết nếu deploy qua Vercel, Railway, Heroku...) 
// Set true để lấy đúng IP gốc của client đằng sau nhiều lớp proxy của Railway
app.set('trust proxy', true);

// Khởi tạo một danh sách Blacklist tạm thời trên RAM
const blockedIPs = new Set();

// Middleware chặn ngay lập tức nếu IP nằm trong Blacklist HOẶC User-Agent đáng ngờ
app.use((req, res, next) => {
    // Với trust proxy = true, req.ip đã là IP thật của Client (trích xuất từ x-forwarded-for)
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    const userAgent = req.headers['user-agent'] || "";

    // Chặn IP đã bị block do Rate Limit (Spam request)
    if (blockedIPs.has(clientIp)) {
        return res.status(403).json({
            code: false,
            message: "IP của bạn đã bị đưa vào Blacklist vĩnh viễn do nghi ngờ tấn công DDoS."
        });
    }

    // Chặn Bot/Script (Chỉ chặn Request đó, không cho vào Blacklist để tránh block nhầm IP Proxy)
    if (!userAgent || userAgent.includes("node-fetch") || userAgent.includes("axios") || userAgent.includes("curl") || userAgent.includes("PostmanRuntime")) {
        console.log(`[BOT ALERT] Đã chặn một bot/script từ IP ${clientIp} (User-Agent: ${userAgent})`);
        return res.status(403).json({
            code: false,
            message: "Phát hiện công cụ tự động. Truy cập bị từ chối!"
        });
    }

    next();
});

// Cấu hình Rate Limit tổng 
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    message: { code: false, message: "Hệ thống đang bảo trì hoặc bạn thao tác quá nhanh. Vui lòng thử lại sau 1 phút!" },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return req.ip;
    },
    handler: (req, res, next, options) => {
        const clientIp = req.ip;
        blockedIPs.add(clientIp);
        console.log(`[DDoS ALERT] Đã đưa IP ${clientIp} vào Blacklist!`);
        res.status(429).json(options.message);
    }
});

// Cấu hình Rate Limit cho các route nhạy cảm
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { code: false, message: "Bạn đã thao tác quá nhiều lần. Vui lòng đợi 15 phút trước khi thử lại." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => req.ip
});

// Áp dụng Rate Limit cho tất cả các route bắt đầu bằng /api/
app.use("/api/", apiLimiter);

// Áp dụng Auth Limiter cho các route xác thực
app.use("/api/v1/client/auth", authLimiter);
app.use("/api/v1/admin/auth", authLimiter);

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