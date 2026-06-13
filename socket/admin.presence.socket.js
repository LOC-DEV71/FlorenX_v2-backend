module.exports = (io, socket) => {
    if (!io.onlineAdmins) io.onlineAdmins = new Map();
    const onlineAdmins = io.onlineAdmins;

    socket.on("admin_online", (adminInfo) => {
        console.log("RECEIVED admin_online FROM", socket.id, adminInfo);
        if (adminInfo && adminInfo.id) {
            onlineAdmins.set(socket.id, adminInfo);
        }
    });

    socket.on("disconnect", () => {
        if (io.onlineAdmins) io.onlineAdmins.delete(socket.id);
    });
};

// Hàm hỗ trợ để lấy danh sách admin đang online không trùng lặp
module.exports.getOnlineAdmins = (req) => {
    const io = req.app.get("io");
    if (!io || !io.onlineAdmins) return [];
    
    const onlineAdmins = io.onlineAdmins;
    const uniqueAdmins = new Map();
    for (const info of onlineAdmins.values()) {
        if (!uniqueAdmins.has(info.id)) {
            uniqueAdmins.set(info.id, info);
        }
    }
    return Array.from(uniqueAdmins.values());
};
