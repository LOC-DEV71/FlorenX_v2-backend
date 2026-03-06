require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

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