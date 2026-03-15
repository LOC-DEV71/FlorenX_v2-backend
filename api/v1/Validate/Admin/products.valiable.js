module.exports.productValidate = async (req, res, next) => {
    try {

        if(req.body.stock){
            req.body.stock = Number(req.body.stock);
        }

        if(req.body.price){
            req.body.price = Number(req.body.price);
        }

        if(!req.body.title){
            return res.status(400).json({
                message: "Vui lòng nhập tên sản phẩm",
                code: false
            })
        }
        if(!req.body.product_category_id){
            return res.status(400).json({
                message: "Vui lòng chọn danh mục sản phẩm"
            })
        }
        if(req.body.price <= 0){
            return res.status(400).json({
                message: "Vui lòng nhập giá",
                code: false
            })
        }
        if(req.body.stock <= 0){
            return res.status(400).json({
                message: "Vui lòng nhập số lượng sản phẩm",
                code: false
            })
        }

        next();
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
