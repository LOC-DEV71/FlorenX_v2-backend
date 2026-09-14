module.exports.pagination = (countProducts, query, objectPagination = {}) => {
    if(query.limit){
        objectPagination.limit = Math.min(Number(query.limit), 100);
    }
    if(query.page){
        objectPagination.currentPage = Number(query.page);
    }

    const totalPage = Math.ceil(countProducts / objectPagination.limit);
    
    objectPagination.totalPage = totalPage;

    objectPagination.skip = objectPagination.limit * (objectPagination.currentPage - 1);

    return objectPagination;
}