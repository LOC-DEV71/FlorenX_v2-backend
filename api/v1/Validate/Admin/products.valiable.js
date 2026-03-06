module.exports.productValiable = async (req, res, next) => {
    try {
        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên sản phẩm"
            })
        }
        if(!req.body.product_category_id){
            return res.status(400).json({
                message: "Vui lòng chọn danh mục sản phẩm"
            })
        }
        if(!req.body.price){
            return res.status(400).json({
                message: "Vui lòng nhập giá"
            })
        }
        if(!req.body.stock){
            return res.status(400).json({
                message: "Vui lòng nhập số lượng sản phẩm"
            })
        }

        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`
        })
    }
}