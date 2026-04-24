const ProductCategories = require("../../Models/products.category");
const Products = require("../../Models/products.models");
const bulidTree = require("../../../../helper/buildTree.helper");
module.exports.index = async (req, res) => {
     try {
        const sort = {
        }
        const find = {
            deleted: false
        }
        if(req.query.sort === "status-active"){
            const [key, value] = req.query.sort.split("-");
            find[key] = value
        }
        if(req.query.sort === "status-inactive"){
            const [key, value] = req.query.sort.split("-");
            find[key] = value
        }

        if(req.query.sort === "title-asc"){
            const [key, value] = req.query.sort.split("-");
            sort[key] = value ? 1 : -1;
        }

        if(req.query.sort === "title-desc"){
            const [key, value] = req.query.sort.split("-");
            sort[key] = value ? -1 : 1;
        }

        if(req.query.sort === "position-desc"){
            const [key, value] = req.query.sort.split("-");
            sort[key] = value ? -1 : 1;
        }
        if(req.query.sort === "position-asc"){
            const [key, value] = req.query.sort.split("-");
            sort[key] = value ? 1 : -1;
        }

        if(Object.keys(sort).length === 0){
            sort.position = 1;
        }
        const productCategories = await ProductCategories.find(find).sort(sort)
        const categories = bulidTree.buildTree(productCategories, "");

        //status active
        const activeCategories = await ProductCategories.find({status: "active", deleted: false}).countDocuments();
        //total
        const totalCategories = await ProductCategories.find({deleted: false}).countDocuments();
        //total parent 
        const parentCategories = await ProductCategories.find({parent_id: null, deleted: false}).countDocuments();
        //total children
        const childCategories = totalCategories - parentCategories;


        return res.status(200).json({
            code: true,
            categories,
            activeCategories,
            totalCategories,
            parentCategories,
            childCategories
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.getListCategory = async (req, res) => {
     try {
        const productCategories = await ProductCategories.find({deleted: false})
        const categories = bulidTree.buildTree(productCategories, "");

        return res.status(200).json({
            code: true,
            categories
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}

module.exports.getCategoryBySlug = async (req, res) => {
     try {
        const productCategory = await ProductCategories.findOne({deleted: false, slug: req.params.slug}).lean();

        return res.status(200).json({
            code: true,
            category: productCategory
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}

module.exports.create = async (req, res) => {
    try { 
        const createCategory = new ProductCategories(req.body);
        await createCategory.save();

        return res.status(200).json({
            code: true,
            message: `Tạo danh mục thành công`
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}
module.exports.update = async (req, res) => {
  try {
    const { _id, slug } = req.body;

    await ProductCategories.updateOne(
      { _id: _id },
      req.body
    );

    return res.status(200).json({
      code: true,
      message: "Cập nhật thành công"
    });
  } catch (error) {
    return res.status(400).json({
      code: false,
      message: `Lỗi: ${error.message}`
    });
  }
};

module.exports.getBulidTree = async (req, res) => {
    try {
        const productCategories = await ProductCategories.find({
            deleted: false
        })
        const categories = bulidTree.buildTree(productCategories, "");
        return res.status(200).json({
            code: true,
            categories
        })
    } catch (error) {
        return res.status(400).json({
            code: false,
            message: `Lỗi: ${error}`
        })
    }
}

// [POST] /api/v1/admin//change-multi/change-multi
module.exports.changeMulti = async (req, res) => {
    try {
        const { selectId, typeChange } = req.body;
        switch (typeChange) {
            case "active":
                await ProductCategories.updateMany(
                    { _id: { $in: selectId } },
                    { status: "active" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "inactive":
                await ProductCategories.updateMany(
                    { _id: { $in: selectId } },
                    { status: "inactive" }
                )
                return res.status(200).json({
                    message: "Cập thật trạng thái thành công",
                    code: true
                })
            case "position":

                const { positions } = req.body;
                for (const item of positions) {
                    await ProductCategories.updateOne(
                        { _id: item.id },
                        { position: item.position }
                    );
                }
                return res.status(200).json({
                    message: "Cập nhật vị trí thành công",
                    code: true
                });
            case "delete":
                const product = await Products.find(
                    {product_category_id: {$in: selectId}}
                )
                if(product){
                    return res.status(400).json({
                    message: "Danh mục đang chứa sản phẩm, yêu cầu thất bại",
                    code: false
                })
                }
                await ProductCategories.updateMany(
                    { _id: { $in: selectId } },
                    {deleted: true}
                )
                return res.status(200).json({
                    message: "Đã xóa danh mục thành công",
                    code: true
                })
            default:
                return;
        }
    } catch (error) {
        return res.status(400).json({
            message: `Lỗi: ${error}`,
            code: false
        })
    }
}
