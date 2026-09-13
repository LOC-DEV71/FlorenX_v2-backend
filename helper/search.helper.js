module.exports.createDiacriticRegex = (keyword) => {
    if (!keyword) return "";
    
    // Convert to base characters (remove all accents)
    // This handles both NFC and NFD input correctly.
    const baseKeyword = keyword
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
    
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
    
    for (let i = 0; i < baseKeyword.length; i++) {
        const char = baseKeyword[i];
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
