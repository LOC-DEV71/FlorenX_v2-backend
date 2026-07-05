const mongoose = require("mongoose");
const Room = require("../../Models/roomChat.model");
const Message = require("../../Models/message.model");
const User = require("../../Models/user.models");

module.exports.index = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";

    let userMatch = {};
    if (keyword) {
      userMatch = {
        $or: [
          { "user_info.email": new RegExp(keyword, "i") },
          { "user_info.fullname": new RegExp(keyword, "i") },
          { "user_info.phone": new RegExp(keyword, "i") }
        ]
      };
    }

    const rooms = await Room.aggregate([
      // 1. Lookup user info
      {
        $addFields: { userObjectId: { $toObjectId: "$user_id" } }
      },
      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "user_info"
        }
      },
      {
        $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true }
      },
      // 2. Filter by keyword if any
      ...(keyword ? [{ $match: userMatch }] : []),
      // 3. Lookup latest message
      {
        $lookup: {
          from: "messages",
          let: { roomId: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$roomId", "$$roomId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "latest_message"
        }
      },
      {
        $addFields: {
          lastMessageInfo: { $arrayElemAt: ["$latest_message", 0] }
        }
      },
      // 4. If no keyword, filter out rooms with NO messages
      ...(keyword ? [] : [{ $match: { lastMessageInfo: { $exists: true, $ne: null } } }]),
      // 5. Sort by latest message time
      {
        $sort: { "lastMessageInfo.createdAt": -1, updatedAt: -1 }
      },
      {
        $limit: 20
      },
      // 6. Project fields
      {
        $project: {
          _id: 1,
          user_id: 1,
          admin_ids: 1,
          createdAt: 1,
          updatedAt: 1,
          fullname: "$user_info.fullname",
          email: "$user_info.email",
          avatar: "$user_info.avatar",
          status: "$user_info.status",
          lastMessage: "$lastMessageInfo.text",
          lastMessageTime: "$lastMessageInfo.createdAt",
          unread: "$unreadAdmin"
        }
      }
    ]);

    res.json({ code: true, rooms });
  } catch (error) {
    res.status(400).json({ code: false, message: `Lỗi: ${error}` });
  }
};