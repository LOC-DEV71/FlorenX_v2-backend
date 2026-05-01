const mongoose = require("mongoose");
const Room = require("../../Models/roomChat.model");

module.exports.index = async (req, res) => {
  try {
    const rooms = await Room.aggregate([
      {
        $limit: 7
      },
      {
        $addFields: {
          userObjectId: {
            $toObjectId: "$user_id"
          }
        }
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
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          user_id: 1,
          admin_ids: 1,
          createdAt: 1,
          updatedAt: 1,
          fullname: "$user_info.fullname",
          avatar: "$user_info.avatar"
        }
      }
    ]);

    res.json({ code: true, rooms });
  } catch (error) {
    res.status(400).json({ code: false, message: `Lỗi: ${error}` });
  }
};