module.exports.pagination = (countProducts, query, objectPagination = {}) => {
    if(query.limit){
        objectPagination.limit = Number(query.limit);
    }
    if(query.page){
        objectPagination.currentPage = Number(query.page);
    }

    const totalPage = Math.ceil(countProducts / objectPagination.limit);
    
    objectPagination.totalPage = totalPage;

    objectPagination.skip = objectPagination.limit * (objectPagination.currentPage - 1);

    return objectPagination;
}