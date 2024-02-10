import authModel from "../DB/Model/authModel.js";
import businessModel from "../DB/Model/businessModel.js";
import chatModel, { messageModel } from "../DB/Model/chatModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import workerModel from "../DB/Model/workerModel.js";
import { sendNotificationForMessage } from "../Utils/Notifications.js";
import chatResources from "../Utils/Resource/chatResources.js";
import { SendChatMessageValidation } from "../Utils/Validator/chatValidator.js";
import { config } from "dotenv";

config();

const GetAllChatRoomsOfUser = async (req) => {
  try {
    const AuthModel = await authModel.findOne({ _id: req.user.id }).populate({
      path: "userProfile",
    });
    if (!AuthModel) {
      return [];
    }
    // Get All Chat Rooms where Status is Accepted or Pending
    const ChatRooms = await chatModel
      .find({
        $or: [
          { user1: AuthModel.userProfile.id, status: { $in: ["accepted", "pending"] } },
          { user2: AuthModel.userProfile.id, status: { $in: ["accepted", "pending"] } },
        ],
      })
      .populate({
        path: "messages",
        populate: {
          path: "user",
        },
        options: { sort: { createdAt: -1 } },
      })
      .sort({ updatedAt: -1 });
    // const ChatRooms = await chatModel.aggregate([
    //   {
    //     $match: {
    //       $or: [
    //         {
    //           user1: mongoose.Types.ObjectId(AuthModel.userProfile.id),
    //           status: { $in: ["accepted", "pending"] },
    //         },
    //         {
    //           user2: mongoose.Types.ObjectId(AuthModel.userProfile.id),
    //           status: { $in: ["accepted", "pending"] },
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "messages",
    //       localField: "messages",
    //       foreignField: "_id",
    //       as: "messages",
    //     },
    //   },
    //   { $sort: { updatedAt: -1 } },
    //   {
    //     $unwind: {
    //       path: "$messages",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },

    //   // {
    //   //   $lookup: {
    //   //     from: "userprofiles",
    //   //     localField: "messages.user",
    //   //     foreignField: "_id",
    //   //     as: "messages.user",
    //   //   },
    //   // },
    //   // {
    //   //   $unwind: {
    //   //     path: "$messages.user",
    //   //     preserveNullAndEmptyArrays: true,
    //   //   },
    //   // },
    //   {
    //     $sort: { updatedAt: -1 },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       user1: { $first: "$user1" },
    //       user2: { $first: "$user2" },
    //       user1Type: { $first: "$user1Type" },
    //       user2Type: { $first: "$user2Type" },
    //       status: { $first: "$status" },
    //       createdAt: { $first: "$createdAt" },
    //       updatedAt: { $first: "$updatedAt" },
    //       messages: { $push: "$messages" },
    //       unreadCount: {
    //         $sum: {
    //           $cond: [
    //             {
    //               $and: [
    //                 { $ne: ["$messages.user", AuthModel.userProfile._id] },
    //                 { $eq: ["$messages.isSeen", false] },
    //               ],
    //             },
    //             1,
    //             0,
    //           ],
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $sort: { updatedAt: -1 },
    //   },
    // ]);
    // // console.log("ChatRoomTest => ", ChatRooms);
    // if (ChatRooms.length === 0) {
    //   return [];
    // }
    const ChatRoomsDetails = ChatRooms.map(async (ChatRoom) => {
      const messages = ChatRoom.messages;
      const unreadMessages = messages.filter((message) => {
        return message.user != AuthModel.userProfile._id && !message.isSeen;
      });
      var User1;
      var User2;
      if (ChatRoom.user1) {
        if (ChatRoom.user1Type == "business") {
          User1 = await businessModel.findOne({ _id: ChatRoom.user1 }).populate([
            { path: "avatarUrl" },
            { path: "businessType", populate: { path: "businessTypeID" } },
            {
              path: "businessType",
              populate: { path: "businessSpecialty", model: "specialty" },
            },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
        } else {
          User1 = await workerModel.findOne({ _id: ChatRoom.user1 }).populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            {
              path: "jobPosition",
              populate: { path: "jobPositionSpecialty", model: "specialty" },
            },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
        }
      }
      if (ChatRoom.user2) {
        // First Find In Parents
        if (ChatRoom.user2Type == "business") {
          User2 = await businessModel.findOne({ _id: ChatRoom.user2 }).populate([
            { path: "avatarUrl" },
            { path: "businessType", populate: { path: "businessTypeID" } },
            {
              path: "businessType",
              populate: { path: "businessSpecialty", model: "specialty" },
            },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
        } else {
          User2 = await workerModel.findOne({ _id: ChatRoom.user2 }).populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            {
              path: "jobPosition",
              populate: { path: "jobPositionSpecialty", model: "specialty" },
            },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
        }
      }

      // Swap User1 and User2 if User1 is not the current user
      if (User1._id.toString() !== req.user.id.toString()) {
        var temp = User1;
        User1 = User2;
        User2 = temp;
      }
      const ChatObj = {
        ChatRoom: ChatRoom,
        User1: User1,
        User2: User2,
      };

      const NewResource = new chatResources(ChatObj);
      NewResource.unreadCount = unreadMessages.length;
      NewResource.hasUnread = ChatRoom.unreadCount > 0 ? true : false;

      // Assigning unreadCount directly in ChatObj
      ChatObj.unreadCount = unreadMessages.length;
      ChatObj.lastMessageTime = (messages[0] && messages[0].createdAt) || ChatRoom.updatedAt; // taking latest message time
      return ChatObj;
    
      return NewResource;
    });

    const ChatRoomsRes = await Promise.all(ChatRoomsDetails);

    return ChatRoomsRes.sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount; // if unread counts are different, sort by them
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime); // else, sort by last message time
    });
  
    return ChatRoomsRes;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// const CreateChatRoom = async (req) => {
//   try {
//     const { error } = CreateChatRoomValidation.validate(req.body);
//     if (error) {
//       return error.details[0].message;
//     }
//     const { user1, user2 } = req.body;

//     const AceptedRequest = await RequestModel.findOne({
//       $or: [
//         { send_by: user1, to: user2, request_status: "Accepted" },
//         { send_by: user2, to: user1, request_status: "Accepted" },
//       ],
//     });

//     if (!AceptedRequest) {
//       return "Request Not Accepted";
//     }

//     // Check if Chat Room Already Exists
//     const ChatRoomExists = await Chat.findOne({
//       $or: [
//         { user1, user2 },
//         { user1: user2, user2: user1 },
//       ],
//     });
//     if (ChatRoomExists) {
//       return "Chat Room Already Exists";
//     }
//     await Chat.create({
//       user1,
//       user2,
//     });

//     return "Chat Room Created Successfully";
//   } catch (error) {
//     console.error(error);
//     return error;
//   }
// };

const GetChatRoom = async (req) => {
  try {
    const ChatRoom = await chatModel
      .findOne({
        _id: req.room.id,
      })
      .populate({
        path: "messages",
        populate: { path: "user" },
      });
    if (!ChatRoom) {
      return [];
    }
    // Get User Details
    var User1;
    var User2;
    if (ChatRoom.user1) {
      if (ChatRoom.user1Type == "business") {
        User1 = await businessModel.findOne({ _id: ChatRoom.user1 }).populate([
          { path: "avatarUrl" },
          { path: "businessType", populate: { path: "businessTypeID" } },
          {
            path: "businessType",
            populate: { path: "businessSpecialty", model: "specialty" },
          },
          { path: "images", model: "fileUpload" },
          { path: "videos", model: "fileUpload" },
          { path: "answeredQuestions", populate: { path: "questionID" } },
          { path: "Subscription" },
          { path: "inAppFeatures" },
        ]);
      } else {
        User1 = await workerModel
          .findOne({ _id: ChatRoom.user1 })
          .populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            { path: "jobPosition", populate: { path: "jobPositionSpecialty", model: "specialty" } },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
      }
    }
    if (ChatRoom.user2) {
      // First Find In Parents
      if (ChatRoom.user2Type == "business") {
        User2 = await businessModel.findOne({ _id: ChatRoom.user2 }).populate([
          { path: "avatarUrl" },
          { path: "businessType", populate: { path: "businessTypeID" } },
          {
            path: "businessType",
            populate: { path: "businessSpecialty", model: "specialty" },
          },
          { path: "images", model: "fileUpload" },
          { path: "videos", model: "fileUpload" },
          { path: "answeredQuestions", populate: { path: "questionID" } },
          { path: "Subscription" },
          { path: "inAppFeatures" },
        ]);
      } else {
        User2 = await workerModel
          .findOne({ _id: ChatRoom.user2 })
          .populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            { path: "jobPosition", populate: { path: "jobPositionSpecialty", model: "specialty" } },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
      }
    }
    if (!User1) {
      return [];
    }
    // Map on ChatRoom.message
    // Swap User1 and User2 if User1 is not the current user
    if (User1._id.toString() !== req.user.id.toString()) {
      var temp = User1;
      User1 = User2;
      User2 = temp;
    }
    await messageModel.updateMany(
      {
        $and: [{ user: User2._id.toString() }, { chatroomId: req.room.id }],
      },
      {
        $set: { isSeen: true },
      },
    );
    const _newMessages = await messageModel
      .find({
        chatroomId: req.room.id,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
    const ChatRoomMessages = await _newMessages.map((message) => {
      console.log(message.user);
      return {
        message: message.message,
        messagetype: message.messagetype,
        lastSeen: message.lastSeen,
        time: message.time,
        user: {
          _id: message.user._id,
          fullName: User1.first_name,
        },
      };
    });

    const ChatObj = {
      ChatRoom: ChatRoomMessages,
      User1: User1,
      User2: User2,
    };
    console.log("ChatObj => ", ChatObj);
    const ChatRoomRes = new chatResources(ChatObj);
    console.log("ChatRoomRes => ", ChatRoomRes);
    return ChatRoomRes;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const SendChatMessage = async (req) => {
  try {
    const { error } = SendChatMessageValidation.validate(req.body);
    if (error) {
      return error.details[0].message;
    }
    const { roomid, user, message, messageId, lastSeen } = req.body;
    console.log("User => ", user);
    const messageDb = await new messageModel({
      message: message,
      messagetype: 0,
      lastSeen: lastSeen,
      user: user,
      messageId: messageId,
      chatroomId: roomid,
    }).save();

    const ChatRoom = await chatModel
      .findByIdAndUpdate(
        roomid,
        {
          $push: {
            messages: messageDb._id,
          },
        },
        { new: true },
      )
      .lean();

    if (!ChatRoom) {
      return [];
    }
    // Get User Details
    var User1;
    var User2;
    if (ChatRoom.user1) {
      if (ChatRoom.user1Type == "business") {
        User1 = await businessModel.findOne({ _id: ChatRoom.user1 }).populate([
          { path: "avatarUrl" },
          { path: "businessType", populate: { path: "businessTypeID" } },
          {
            path: "businessType",
            populate: { path: "businessSpecialty", model: "specialty" },
          },
          { path: "images", model: "fileUpload" },
          { path: "videos", model: "fileUpload" },
          { path: "answeredQuestions", populate: { path: "questionID" } },
          { path: "Subscription" },
          { path: "inAppFeatures" },
        ]);
      } else {
        User1 = await workerModel
          .findOne({ _id: ChatRoom.user1 })
          .populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            { path: "jobPosition", populate: { path: "jobPositionSpecialty", model: "specialty" } },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
      }
    }
    if (ChatRoom.user2) {
      // First Find In Parents
      if (ChatRoom.user2Type == "business") {
        User2 = await businessModel.findOne({ _id: ChatRoom.user2 }).populate([
          { path: "avatarUrl" },
          { path: "businessType", populate: { path: "businessTypeID" } },
          {
            path: "businessType",
            populate: { path: "businessSpecialty", model: "specialty" },
          },
          { path: "images", model: "fileUpload" },
          { path: "videos", model: "fileUpload" },
          { path: "answeredQuestions", populate: { path: "questionID" } },
          { path: "Subscription" },
          { path: "inAppFeatures" },
        ]);
      } else {
        User2 = await workerModel
          .findOne({ _id: ChatRoom.user2 })
          .populate([
            { path: "avatarUrl" },
            { path: "jobPosition", populate: { path: "jobPositionID" } },
            { path: "jobPosition", populate: { path: "jobPositionSpecialty", model: "specialty" } },
            { path: "images", model: "fileUpload" },
            { path: "videos", model: "fileUpload" },
            { path: "answeredQuestions", populate: { path: "questionID" } },
            { path: "Subscription" },
            { path: "inAppFeatures" },
          ]);
      }
    }
    // if (User1._id.toString() !== user.toString()) {
    //   User1?.devices.forEach((device) => {
    //     sendNotification(
    //       device.deviceToken,
    //       "New Message",
    //       "You have a new message from " + User2.first_name,
    //     );
    //   });
    // }
    // if (User2._id.toString() !== user.toString()) {
    //   User2.devices.forEach((device) => {
    //     sendNotification(
    //       device.deviceToken,
    //       "New Message",
    //       "You have a new message from " + User1.first_name,
    //     );
    //   });
    // }
    // if (!User1 || !User2) {
    //     return "User Not Found";
    // }
    if (User1._id.toString() !== user.toString()) {
      var temp = User1;
      User1 = User2;
      User2 = temp;
    }
    const _newMessages = await messageModel
      .find({
        chatroomId: roomid,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
    const ChatRoomMessages = await _newMessages.map((message) => {
      console.log(message.user);
      return {
        message: message.message,
        messagetype: message.messagetype,
        lastSeen: message.lastSeen,
        time: message.time,
        user: {
          _id: message.user._id,
          fullName: User1.first_name,
        },
      };
    });

    // Swap User1 and User2 if User1 is not the current user

    const ChatObj = {
      ChatRoom: ChatRoomMessages,
      User1: User1,
      User2: User2,
    };

    const ChatRoomRes = new chatResources(ChatObj);
    const receiverId = User2.authID.toString();
    const sender = User1;
    if (receiverId) {
      const devices = await DeviceModel.find({
        authID: receiverId.toString(),
      });

      if (devices && devices.length) {
        try {
          devices.forEach((device) => {
            sendNotificationForMessage({
              token: device.deviceToken,
              title: `${sender.firstName} ${sender.lastName}`,
              body: `${message}`,
              data: {
                senderImage:
                  sender && sender.avatarUrl && sender.avatarUrl.file
                    ? process.env.ENDPOINT + sender.avatarUrl.file
                    : "",
                message: `${message}`,
                type: "message",
                chatroomId: ChatRoom._id.toString(),
              },
            });
          });
        } catch (e) {
          console.log("error while sending notification =>", e);
        }
      }
    }
    return ChatRoomRes;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const ChatController = {
  GetAllChatRoomsOfUser,
  // CreateChatRoom,
  GetChatRoom,
  SendChatMessage,
};

export default ChatController;
