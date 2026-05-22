const Notifications = require("../../Models/notification.model");
module.exports.getList = async (req, res) => {
    try {
        const find = {}
        const notifications = await Notifications.find(find).sort({ createdAt: -1 }).limit(10);

        return res.status(200).json({
            code: true,
            notifications
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
module.exports.readNotification = async (req, res) => {
    try {
        const id = req.params.id || "";

        await Notifications.updateOne(
            {_id: id},
            {is_read: true}
        )

        return res.status(200).json({
            code: true,
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}

module.exports.readAllNotification = async (req, res) => {
    try {
        const notification = await Notifications.find({
            is_read: false
        })
        const ids = notification.map(item => item._id.toString());
        
        await Notifications.updateMany(
            {_id: {$in: ids}},
            {is_read: true}
        )
        return res.status(200).json({
            code: true,
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}