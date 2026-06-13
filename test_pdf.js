const PDFDocument = require("pdfkit");
const { uploadRawStream } = require("./service/cloudinary.service");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");

const generatePDFBuffer = (title, content) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            
            const fontPath = path.join(__dirname, "Roboto-Regular.ttf");
            doc.font(fontPath);
            
            doc.fontSize(20).text(title || "Báo Cáo", { align: "center" });
            doc.moveDown();
            
            doc.fontSize(12).text(content || "Nội dung trống", { align: "left" });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Generating buffer...");
        const buffer = await generatePDFBuffer(null, undefined);
        console.log("Buffer size:", buffer.length);
        console.log("Uploading to Cloudinary...");
        const result = await uploadRawStream(buffer);
        console.log("Upload result:", result.secure_url);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
