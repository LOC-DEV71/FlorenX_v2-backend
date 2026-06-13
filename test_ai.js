require("dotenv").config();
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const System = require("./api/v1/Models/system.model");

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const systemConfig = await System.findOne({});
        const genAI = new GoogleGenerativeAI(systemConfig.ai.apiKey);
        
        const processOrderTool = { name: "processOrder", parameters: { type: "OBJECT", properties: { orderCode: { type: "STRING" } } } };
        const toggleAutoProcessOrdersTool = { name: "toggleAutoProcessOrders", parameters: { type: "OBJECT", properties: { status: { type: "BOOLEAN" } } } };
        const getDashboardStatsTool = { name: "getDashboardStats", parameters: { type: "OBJECT", properties: { year: { type: "NUMBER" } } } };
        const generatePDFTool = { name: "generatePDF", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, content: { type: "STRING" } } } };
        const getOrderDetailsTool = { name: "getOrderDetails", parameters: { type: "OBJECT", properties: { orderCode: { type: "STRING" } } } };
        const getExportReceiptDetailsTool = { name: "getExportReceiptDetails", parameters: { type: "OBJECT", properties: { receiptCode: { type: "STRING" } } } };

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.5-flash",
            tools: [{ functionDeclarations: [processOrderTool, toggleAutoProcessOrdersTool, getDashboardStatsTool, generatePDFTool, getOrderDetailsTool, getExportReceiptDetailsTool, createArticleTool] }]
        });
        const chat = model.startChat();

        let result = await chat.sendMessage("Tạo bài viết về cyber punk laptop 2026 đi");
        let response = await result.response;
        
        // Mock function callback
        const processOrderCallback = async (name, args) => {
            console.log("Called tool:", name, args);
            return {
                status: "success",
                message: "Đã nháp xong bài",
                action: "NAVIGATE_TO_CREATE_NEWS",
                draftPayload: { title: args.title }
            };
        };

        let extraData = {};
        while (response.functionCalls() && response.functionCalls().length > 0) {
            const call = response.functionCalls()[0];
            const funcRes = await processOrderCallback(call.name, call.args);
            
            if (funcRes.action) {
                extraData.action = funcRes.action;
                extraData.draftPayload = funcRes.draftPayload;
            }

            result = await chat.sendMessage([{
                functionResponse: { name: call.name, response: funcRes }
            }]);
            response = await result.response;
            console.log("Second Function Calls:", response.functionCalls());
            console.log("Second Text:", response.text());
        }
        process.exit(0);
    } catch (e) {
        console.error("Crash:", e);
        process.exit(1);
    }
}
run();
