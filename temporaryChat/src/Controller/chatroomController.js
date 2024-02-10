import { UserOnChatroomModel } from "../DB/Model/userOnChatroomModel.js";
import { mongoose } from "mongoose";
import { ChatroomResource } from "../Utils/Resource/chatroomResource.js";
import { MessageModel } from "../DB/Model/messageModel.js";
import { ChatroomModel } from "../DB/Model/chatroomModel.js";
// import { fileFromPathSync } from "formdata-node/file-from-path";
// import { FormData } from "formdata-node";
// import axios from "axios";
import { config } from "dotenv";
// import MediaModel from "../DB/Model/media.js";
import { io } from "../app.js";
// import UserModel from "../../../socialMediaService/src/DB/Model/userModel.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
// import UserModel from "../DB/Model/userModel.js";
import NotificationModel from "../DB/Model/notificationModel copy.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
import AuthModel from "../DB/Model/authModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import { PostResource } from "../Utils/Resource/postResource.js";
// import { CustomError } from "../Utils/CustomError.js";
config();

// const LIBRARY_MEDIA_SERVICE_URL = process.env.LIBRARY_MEDIA_SERVICE_URL;

// const uploadFileToMediaService = async ({ file, session, profileId }) => {
//   const mediaType = file.mimetype.split("/")[0];
//   const mediaUrl = `public/uploads/library/${file.filename}`;

//   const formData = new FormData();
//   const readBuffer = fileFromPathSync(file.path, file.filename, { type: file.mimetype });
//   formData.append("media", readBuffer, file.filename);

//   const headers = {
//     "Content-Type": `multipart/form-data;`,
//   };

//   const response = await axios.post(LIBRARY_MEDIA_SERVICE_URL, formData, { headers });
//   if (response.status !== 201) {
//     throw new Error("Error while uploading file to media service");
//   }

//   const media = new MediaModel({
//     mediaType,
//     mediaUrl,
//     profile: profileId,
//     userType: "User",
//   });
//   await media.save({ session });

//   return media._id;
// };
export const getAllChatrooms = async (req, res, next) => {
  const id = req.profileId;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return [];
  }
  try {
    const result = UserOnChatroomModel.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(id),
        },
      },
      {
        $unwind: "$chatrooms",
      },
      {
        $lookup: {
          from: "chatrooms",
          localField: "chatrooms",
          foreignField: "_id",
          as: "_chatrooms",
          pipeline: [
            {
              $lookup: {
                from: "messages",
                let: { lastMessage: "$lastMessage" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$lastMessage"],
                      },
                    },
                  },
                ],
                as: "lastMessage",
              },
            },
            {
              $project: {
                users: 1,
                _id: 1,
                lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "users",
                foreignField: "_id",
                as: "users",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      fullName: 1,
                      userName: 1,
                      image: 1,
                      lastMessage: 1,
                    },
                  },
                  {
                    $lookup: {
                      from: "media",
                      localField: "image",
                      foreignField: "_id",
                      as: "image",
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      fullName: 1,
                      userName: 1,
                      image: { $arrayElemAt: ["$image", 0] },
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "messages",
                let: { chatroomId: "$_id", userId: mongoose.Types.ObjectId(id) },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$chatroom", "$$chatroomId"] },
                          { $ne: ["$sender", "$$userId"] },
                          { $eq: ["$isRead", false] },
                        ],
                      },
                    },
                  },
                  {
                    $group: {
                      _id: "$chatroom",
                      count: { $sum: 1 },
                    },
                  },
                ],
                as: "unreadCount",
              },
            },
            {
              $addFields: {
                hasUnreadMessages: { $gt: [{ $size: "$unreadCount" }, 0] },
                unreadMessages: {
                  $cond: [
                    { $gt: [{ $size: "$unreadCount" }, 0] },
                    { $arrayElemAt: ["$unreadCount.count", 0] },
                    0,
                  ],
                },
              },
            },
          ],
        },
      },

      {
        $unwind: "$_chatrooms",
      },

      {
        $group: {
          _id: "$_id",
          chatrooms: { $push: "$_chatrooms" },
        },
      },
      {
        $project: {
          _id: 0,
          chatrooms: {
            $map: {
              input: "$chatrooms",
              as: "chatroom",
              in: {
                _id: "$$chatroom._id",
                users: {
                  $map: {
                    input: "$$chatroom.users",
                    as: "user",
                    in: {
                      _id: "$$user._id",
                      fullName: "$$user.fullName",
                      userName: "$$user.userName",
                      image: "$$user.image",
                    },
                  },
                },
                lastMessage: "$$chatroom.lastMessage",
                hasUnreadMessages: "$$chatroom.hasUnreadMessages",
                unreadMessages: "$$chatroom.unreadMessages",
              },
            },
          },
        },
      },
    ]);
    Promise.all([result])
      .then(([result]) => {
        const chatRooms = result[0];
        if (!chatRooms) {
          return next(CustomSuccess.createSuccess([], "No chat rooms found for user", 200));
        }

        const chatRoomResources = chatRooms.chatrooms.map(async (chatRoom) => {
          const unreadMessages = await MessageModel.countDocuments({
            chatroom: chatRoom._id,
            sender: { $ne: id },
            isRead: false,
          });
          const resource = new ChatroomResource(chatRoom, id);
          resource.unreadMessagesCount = unreadMessages;
          resource.hasUnreadMessages = !!unreadMessages;

          return resource;
        });
        return Promise.all(chatRoomResources)
          .then((chatRoomResources) => {
            return next(CustomSuccess.createSuccess(chatRoomResources, "Chatrooms found", 200));
          })
          .catch((error) => {
            return next(CustomError.badRequest(error.message));
          });
      })
      .catch((error) => {
        return next(CustomError.badRequest(error.message));
      });
    return;
  } catch (error) {
    io.to("user_" + id).emit("error", { message: error.message });
    return false;
  }
};

export const getChatroom = async (req, res, next) => {
  const id = req.profileId;
  const chatroomId = req.params.chatroomId;
  // const { page = 0, limit = 40 } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid user id"));
  }
  try {
    const messages = MessageModel.aggregate([
      {
        $match: {
          chatroom: mongoose.Types.ObjectId(chatroomId),
        },
      },
      {
        $lookup: {
          from: "attachments",
          localField: "attachments",
          foreignField: "_id",
          as: "attachments",
        },
      },

      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          pipeline: [
            {
              $lookup: {
                from: "media",
                localField: "attachments",
                foreignField: "_id",
                as: "attachments",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [
                  {
                    $project: {
                      id: "$_id",
                      fullName: 1,
                      userName: 1,
                      image: 1,
                    },
                  },

                  {
                    $lookup: {
                      from: "media",
                      localField: "image",
                      foreignField: "_id",
                      as: "image",
                    },
                  },
                  {
                    $unwind: {
                      path: "$image",
                      includeArrayIndex: "image",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      id: 1,
                      fullName: 1,
                      userName: 1,
                      // image: {
                      //   $ifNull: [
                      //     { $arrayElemAt: [{ $ifNull: ["$image", []] }, 0] },
                      //     "uploads/public/default.png",
                      //   ],
                      // },
                    },
                  },
                ],
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",

                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "post",
        },
      },
      // {
      //   $group: {
      //     _id: 0,
      //     sender: {
      //       $first:"$sender"
      //     },
      //     receiver: {
      //       $first:"$receiver"
      //     },
      //     text: {
      //       $first: "$text"
      //     }
      //   }
      // },
      {
        $project: {
          chatroom: 1,
          sender: 1,
          receiver: 1,
          text: 1,
          post: { $arrayElemAt: ["$post", 0] },
          attachments: {
            $ifNull: [
              {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: {
                          $ifNull: [
                            {
                              $ifNull: [
                                { $arrayElemAt: [{ $ifNull: ["$attachments", []] }, 0] },
                                null,
                              ],
                            },
                            [],
                          ],
                        },
                      },
                      0,
                    ],
                  },
                  then: {
                    $ifNull: [{ $arrayElemAt: [{ $ifNull: ["$attachments", []] }, 0] }, null],
                  },
                  else: null,
                },
              },
              null,
            ],
          },
          createdAt: 1,
          isRead: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]).sort({ createdAt: -1 });

    const updateIsRead = MessageModel.updateMany(
      {
        chatroom: mongoose.Types.ObjectId(chatroomId),
        receiver: mongoose.Types.ObjectId(id),
      },
      {
        isRead: true,
      },
    );
    Promise.all([messages, updateIsRead])
      .then(([messages]) => {
        const newMessageList = messages.map((message) => {
          if (message.post) {
            message.post = new PostResource(message.post);
          }
          return message;
        });
        return next(CustomSuccess.createSuccess(newMessageList, "Messages found", 200));
      })
      .catch((error) => {
        console.log(error);
        return next(CustomError.badRequest(error.message));
      });

    return;
  } catch (error) {
    next(CustomError.badRequest(error.message));
    return;
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const receiverId = req.params.receiverId;
    const id = req.profileId;
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(receiverId))
      return next(CustomError.badRequest("Invalid user id"));
    if (id === receiverId)
      return next(CustomError.badRequest("You can't send message to yourself"));

    const { message, postId, trackingId } = req.body;
    if (!message && !postId) return next(CustomError.badRequest("Message is required"));

    // insert media attachments
    const readMessages = MessageModel.updateMany(
      {
        receiver: id,
        sender: receiverId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      },
    );
    const newMessage = new MessageModel({
      sender: id,
      text: message,
      receiver: receiverId,
      post: postId,
    });
    const chatroom = ChatroomModel.findOneAndUpdate(
      {
        users: {
          $all: [
            { $elemMatch: { $eq: mongoose.Types.ObjectId(id) } },
            { $elemMatch: { $eq: mongoose.Types.ObjectId(receiverId) } },
          ],
        },
      },
      {
        $set: { lastMessage: newMessage._id },
        $setOnInsert: { users: [id, receiverId] },
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    return await chatroom.then(async (chatroom) => {
      console.log("running");
      try {
        const userOnChatroom = UserOnChatroomModel.findOneAndUpdate(
          {
            user: id,
          },
          {
            $addToSet: { chatrooms: chatroom._id },
          },
          {
            new: true,
            upsert: true,
          },
        )
          .populate([
            {
              path: "user",
              populate: [
                {
                  path: "image",
                },
              ],
            },
          ])
          .lean();
        const receiverChatroom = UserOnChatroomModel.findOneAndUpdate(
          {
            user: receiverId,
          },
          {
            $addToSet: { chatrooms: chatroom._id },
          },
          {
            new: true,
            upsert: true,
          },
        ).populate([
          {
            path: "user",
            populate: [
              {
                path: "auth",
                model: AuthModel,
                populate: [
                  {
                    path: "devices",
                    model: DeviceModel,
                    populate: [
                      {
                        path: "deviceSetting",
                        model: DeviceSettingModel,
                        match: {
                          isNotificationOn: true,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]);

        newMessage.chatroom = chatroom._id;
        console.log("running-before promise");
        return await Promise.all([
          newMessage.save(),
          userOnChatroom,
          receiverChatroom,
          readMessages,
        ])
          .then(([message, sender, receiver]) => {
            console.log("running promise all");
            const title = sender.user.userName ? "@" + sender.user.userName : sender.user.fullName;
            const body = message.text ? message.text : "Sent a new post";
            const payload = {
              type: "message",
              chatroomId: chatroom._id,
              sender: sender.user,
              senderImage: sender.user.image
                ? sender.user.image.mediaUrl
                  ? sender.user.image.mediaUrl
                  : "public/uploads/default.png"
                : "public/uploads/default.png",
            };
            const notification = new NotificationModel({
              title,
              body,
              payload,
              auth: sender.user._id
            });
            const { devices } = receiver.user.auth;
            const notificationPromises = devices.map((device) => {
              if (device.deviceSetting) {
                const deviceToken = device.deviceSetting.deviceToken;
                if (!deviceToken) return new Promise(() => true);
                return sendNotificationWithPayload({
                  token: deviceToken,
                  title,
                  body,
                  data: payload,
                });
              }
            });

            console.log("io rooms", io.sockets.adapter.rooms);
            io.to("user_" + receiverId).emit("newMessageReceived", message);

            Promise.all([...notificationPromises, notification.save()]).then(() => {
              return next(
                CustomSuccess.createSuccess(
                  {
                    trackingId,
                    chatroomId: chatroom._id,
                  },
                  "Message sent",
                  200,
                ),
              );
            });
            return { message, sender, receiver };
          })
          .catch((err) => {
            io.to("user_" + id).emit("error", err.message);
            return next(CustomError.badRequest(err.message));
          });
      } catch (err) {
        io.to("user_" + id).emit("error", { message: err.message });
        console.log(err);
      }
    });
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

// export const sendAttachment = async ( { message, user, sender } ) =>
// {

// };
