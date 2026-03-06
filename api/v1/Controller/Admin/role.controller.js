module.exports.index = async (req, res) => {
    
}

module.exports.create = async (req, res) => {
    try {
        return res.status(200).json({
            message: "Tạo tài khoản mới thành công"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}