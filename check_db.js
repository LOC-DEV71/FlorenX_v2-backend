const mongoose = require('mongoose');
const AiMessageAdmin = require('./api/v1/Models/ai.message.admin.model');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const docs = await AiMessageAdmin.find({});
  console.log("ALL MESSAGES:", docs.map(d => ({ id: d._id, sessionId: d.sessionId, text: d.text })));
  process.exit(0);
});
