const category = require("../api/v1/Models/products.category");

const getChildrenCategories = async (parentId) => {
    const children = await category.find({
        parent_id: parentId
    });

    let ids = [];

    for (const child of children) {
        ids.push(child._id);

        const subIds = await getChildrenCategories(child._id);
        ids = ids.concat(subIds);
    }

    return ids;
};

const getProductsByParentCategory  = async (parentId) => {
    const childIds = await getChildrenCategories(parentId);
    const categortIds = [parentId, ...childIds];

    const products = await Product.find(
        {product_category_id: {$in: categortIds}}
    )

    return products;
}

module.exports = {
    getChildrenCategories,
    getProductsByParentCategory
};

