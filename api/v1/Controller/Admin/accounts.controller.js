const Account = require("../../Models/accounts.model");
module.exports.index = async (req, res) => {
    return res.status(200).json({
        message: "OK"
    })
}
module.exports.create = async (req, res) => {
    try {
        
        return res.status(200).json({
            message: "OK"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}