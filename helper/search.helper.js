module.exports.createDiacriticRegex = (keyword) => {
    if (!keyword) return "";
    
    // Map of base characters to their accented versions
    const accents = {
        'a': '[aáàảãạâấầẩẫậăắằẳẵặAÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ]',
        'e': '[eéèẻẽẹêếềểễệEÉÈẺẼẸÊẾỀỂỄỆ]',
        'i': '[iíìỉĩịIÍÌỈĨỊ]',
        'o': '[oóòỏõọôốồổỗộơớờởỡợOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ]',
        'u': '[uúùủũụưứừửữựUÚÙỦŨỤƯỨỪỬỮỰ]',
        'y': '[yýỳỷỹỵYÝỲỶỸỴ]',
        'd': '[dđDĐ]',
    };

    let regexStr = "";
    
    for (let i = 0; i < keyword.length; i++) {
        const char = keyword[i].toLowerCase();
        if (accents[char]) {
            regexStr += accents[char];
        } else {
            // Escape special regex characters
            if (['\\', '^', '$', '.', '|', '?', '*', '+', '(', ')', '[', ']', '{', '}'].includes(char)) {
                regexStr += '\\' + char;
            } else {
                regexStr += char;
            }
        }
    }

    return regexStr;
};
