const Warehouse = require("../../Models/warehouse.models");

module.exports.getList = async (req, res) => {
     try {
        const warehouse = await Warehouse.find();
        return res.status(200).json({
            warehouse,
            code: true
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}