const mongoose = require("mongoose");

module.exports.connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connect mongoose success")
    } catch (error) {
        console.error(error);
    }
}