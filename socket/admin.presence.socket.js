const System = require("../api/v1/Models/system.model");

module.exports = (io, socket) => {
    if (!io.onlineAdmins) io.onlineAdmins = new Map();
    const onlineAdmins = io.onlineAdmins;

    socket.on("admin_online", async (adminInfo) => {
        console.log("RECEIVED admin_online FROM", socket.id, adminInfo);
        if (adminInfo && adminInfo.id) {
            onlineAdmins.set(socket.id, adminInfo);
            
            try {
                const system = await System.findOne({});
                if (system && system.ai) {
                    socket.emit("admin_toggle_auto_system_monitor", { enabled: system.ai.autoSystemMonitor || false });
                }
            } catch (err) {
                console.log("Error syncing God Mode status on connect:", err);
            }
        }
    });

    socket.on("admin_change_page", (data) => {
        if (onlineAdmins.has(socket.id)) {
            const adminInfo = onlineAdmins.get(socket.id);
            adminInfo.current_page = data.page;
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
