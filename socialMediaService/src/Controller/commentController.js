// import mongoose, { Types } from "mongoose";
// import AuthModel from "../DB/Model/authModel.js";
// import { CommentModel } from "../DB/Model/commentModel.js";
// // import DeviceModel from "../DB/Model/deviceModel.js";
// import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
// import NotificationModel from "../DB/Model/notificationModel.js";
// import { PostModel } from "../DB/Model/postModel.js";
// import { ReactionModel } from "../DB/Model/reactionModel.js";
// import UserModel from "../DB/Model/userModel.js";
// import { sendNotificationWithPayload } from "../Utils/Notifications.js";
// import { CommentResource } from "../Utils/Resource/commentResource.js";
// import CustomError from "../Utils/ResponseHandler/CustomError.js";
// import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";

// export const createComment = async (req, res, next) => {
//   const { id } = req.params;
//   const { comment, isReply = false, mentions = [] } = req.body;
//   if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
//   if (!comment || comment.trim() === "") return next(CustomError.badRequest("Comment is required"));
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const mentionedUsers = await UserModel.find({ username: { $in: mentions } });
//     let post, newComment, existingComment, parent;
//     if (!isReply) {
//       post = await PostModel.findById(id);
//       if (!post) return next(CustomError.notFound("Post not found"));
//       newComment = new CommentModel({
//         text: comment,
//         isReply: false,
//         commentType: "Post",
//         parent: id,
//         user: req.profileId,
//         mentions: mentionedUsers.map((mention) => mention._id),
//       });
//       post.comments.push(newComment._id);
//       parent = await (await post.save()).populate({ path: "user", model: UserModel });
//     } else {
//       existingComment = await CommentModel.findById(id);
//       if (!existingComment) return next(CustomError.notFound("Comment not found"));
//       newComment = new CommentModel({
//         text: comment,
//         isReply: true,
//         parent: id,
//         commentType: "Comment",
//         user: req.profileId,
//       });
//       existingComment.replies.push(newComment._id);

//       parent = await (await existingComment.save()).populate({ path: "user", model: UserModel });
//     }
//     const savedComment = await newComment.save().then((comment) => {
//       return comment.populate([
//         {
//           path: "user",
//           model: UserModel,
//           populate: {
//             path: "image",
//           },
//         },
//       ]);
//     });
//     const user = await AuthModel.findOne({ profile: req.profileId })
//       .populate([
//         {
//           path: "profile",
//           model: UserModel,
//           select: ["userName", "image"],
//           populate: {
//             path: "image",
//           },
//         },
//       ])
//       .lean();
//     const devices = await DeviceSettingModel.find({
//       auth: parent.user.auth.toString(),
//       isNotificationOn: true,
//     }).lean();
//     if (devices && devices.length > 0) {
//       const message = isReply ? "replied to your comment" : "commented on your post";
//       const notification = {
//         title: "New Comment",
//         body: `${user.profile.userName} ${message}`,
//         data: {
//           type: "comment",
//           comment: savedComment._id.toString(),
//           commenterProfileImage:
//             user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
//         },
//       };
//       const _devices = devices.map((device) => {
//         const { deviceToken } = device
//           ? device
//           : {
//               deviceToken: null,
//             };
//         if (deviceToken) {
//           return sendNotificationWithPayload({
//             token: deviceToken,
//             ...notification,
//           });
//         } else {
//           return new Promise(() => true);
//         }
//       });

//       notification.payload = {
//         type: "comment",
//         comment: savedComment._id,
//         commenterProfileImage:
//           user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
//       };
//       delete notification.data;
//       const newNotification = new NotificationModel({
//         ...notification,
//         auth: user._id.toString(),
//         payload: {
//           type: "comment",
//           comment: savedComment._id,
//           commenterProfileImage:
//             user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
//         },
//       });
//       await Promise.all([..._devices, newNotification.save()]);
//     }

//     const commentResource = new CommentResource(savedComment);
//     return next(
//       CustomSuccess.createSuccess(
//         commentResource,
//         `${isReply ? "Replied" : "Commented"} successfully`,
//         201,
//       ),
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     return next(CustomError.internal(error.message));
//   } finally {
//     await session.endSession();
//   }
// };
// export const updateComment = async (req, res, next) => {
//   const { id } = req.params;
//   const { comment } = req.body;
//   if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
//   if (!comment || comment.trim() === "") return next(CustomError.badRequest("Comment is required"));
//   try {
//     const commentDb = await CommentModel.findOneAndUpdate(
//       {
//         _id: id,
//         user: req.profileId,
//       },
//       {
//         text: comment,
//         isEdited: true,
//       },
//       {
//         new: true,
//       },
//     ).populate([
//       {
//         path: "user",
//         populate: {
//           path: "image",
//         },
//       },
//     ]);
//     if (!commentDb) return next(CustomError.notFound("Comment not found"));
//     const commentResource = new CommentResource(commentDb);
//     next(CustomSuccess.createSuccess(commentResource, "comment updated successfully", 201));
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };
// export const deleteComment = async (req, res, next) => {
//   const { id } = req.params;
//   if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
//   try {
//     const comment = await CommentModel.findOneAndDelete({
//       _id: id,
//       user: req.profileId,
//     });
//     if (!comment) return next(CustomError.notFound("Comment not found"));
//     await UserModel.findByIdAndUpdate(req.profileId, { $pull: { comments: comment._id } });
//     next(CustomSuccess.createSuccess({}, "comment deleted successfully", 201));
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };
// export const commentReplies = async (req, res, next) => {
//   const { id } = req.params;
//   const { skip = 0, limit = 10, sortBy = "popularity" } = req.query;

//   if (!id || !Types.ObjectId.isValid(id)) {
//     return next(CustomError.badRequest("Invalid ID"));
//   }

//   try {
//     const pipeline = [
//       { $match: { _id: mongoose.Types.ObjectId(id) } },
//       { $unwind: "$replies" },
//       {
//         $lookup: {
//           from: "comments",
//           localField: "replies",
//           foreignField: "_id",
//           as: "replies",
//         },
//       },
//       { $unwind: "$replies" },
//       {
//         $lookup: {
//           from: "users",
//           localField: "replies.user",
//           foreignField: "_id",
//           as: "replies.user",
//         },
//       },
//       { $unwind: "$replies.user" },
//       {
//         $lookup: {
//           from: "media",
//           localField: "replies.user.image",
//           foreignField: "_id",
//           as: "replies.user.image",
//         },
//       },
//       { $unwind: { path: "$replies.user.image", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: "$replies._id",
//           replies: { $first: "$replies" },
//           popularity: { $sum: { $size: "$replies.reactions" } },
//           createdAt: { $first: "$replies.createdAt" },
//           user: { $first: "$replies.user" },
//         },
//       },
//       {
//         $sort: {
//           [sortBy === "newestFirst" ? "createdAt" : "popularity"]: -1,
//           createdAt: -1,
//         },
//       },
//       {
//         $facet: {
//           replies: [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }],
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           replies: 1,
//           user: {
//             _id: 1,
//             fullName: 1,
//             userName: 1,
//             image: {
//               $cond: {
//                 if: { $eq: ["$user.image", null] },
//                 then: null,
//                 else: {
//                   _id: "$user.image._id",
//                   url: "$user.image.url",
//                 },
//               },
//             },
//           },
//           popularity: 1,
//           createdAt: 1,
//         },
//       },
//       {
//         $unwind: {
//           path: "$replies",
//         },
//       },
//     ];

//     const [replies, count] = await Promise.all([
//       CommentModel.aggregate(pipeline),
//       CommentModel.countDocuments({ parent: mongoose.Types.ObjectId(id) }),
//     ]);

//     const remainingCount =
//       count - parseInt(skip) - replies.length ? count - parseInt(skip) - replies.length : 0;
//     const repliesResource = replies.map((reply) => new CommentResource(reply.replies.replies));
//     return next(
//       CustomSuccess.createSuccess(
//         { replies: repliesResource, remainingCount },
//         "Replies fetched successfully",
//         200,
//       ),
//     );
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };
// export const commentsByPost = async (req, res, next) => {
//   const { id } = req.params;
//   const { skip = 0, limit = 10, sortBy = "popularity" } = req.query;

//   if (!id || !Types.ObjectId.isValid(id)) {
//     return next(CustomError.badRequest("Invalid ID"));
//   }

//   try {
//     const pipeline = [
//       { $match: { _id: mongoose.Types.ObjectId(id) } },
//       { $unwind: "$comments" },
//       {
//         $lookup: {
//           from: "comments",
//           localField: "comments",
//           foreignField: "_id",
//           as: "comments",
//         },
//       },
//       { $unwind: "$comments" },
//       {
//         $lookup: {
//           from: "users",
//           localField: "comments.user",
//           foreignField: "_id",
//           as: "comments.user",
//         },
//       },
//       { $unwind: "$comments.user" },
//       {
//         $lookup: {
//           from: "media",
//           localField: "comments.user.image",
//           foreignField: "_id",
//           as: "comments.user.image",
//         },
//       },
//       { $unwind: { path: "$comments.user.image", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: "$comments._id",
//           comments: { $first: "$comments" },
//           popularity: { $sum: { $size: "$comments.reactions" } },
//           createdAt: { $first: "$comments.createdAt" },
//           user: { $first: "$comments.user" },
//         },
//       },
//       {
//         $sort: {
//           [sortBy === "newestFirst" ? "createdAt" : "popularity"]: -1,
//           createdAt: -1,
//         },
//       },
//       {
//         $facet: {
//           comments: [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }],
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           comments: 1,
//           user: {
//             _id: 1,
//             fullName: 1,
//             userName: 1,
//             image: {
//               $cond: {
//                 if: { $eq: ["$user.image", null] },
//                 then: null,
//                 else: {
//                   _id: "$user.image._id",
//                   url: "$user.image.url",
//                 },
//               },
//             },
//           },
//           popularity: 1,
//           createdAt: 1,
//         },
//       },
//       {
//         $unwind: {
//           path: "$comments",
//         },
//       },
//     ];

//     const [comments, count] = await Promise.all([
//       PostModel.aggregate(pipeline),
//       CommentModel.countDocuments({ parent: mongoose.Types.ObjectId(id) }),
//     ]);

//     const remainingCount =
//       count - parseInt(skip) - comments.length ? count - parseInt(skip) - comments.length : 0;
//     const commentsResource = comments.map(async (comment) => {
//       const _comment = comment.comments.comments;
//       const followers = _comment.user ? _comment.user.followers : [];

//       // console.log(_comment);
//       _comment.user.isFollowing = followers.toString().includes(req.profileId);
//       const userReaction = await ReactionModel.findOne({
//         parent: _comment._id,
//         user: req.profileId,
//       });
//       _comment.reactionType = userReaction ? userReaction.reactionType : null;
//       _comment.isReacted = !!userReaction;
//       console.log(req.profileId);

//       return new CommentResource(_comment);
//     });

//     return next(
//       CustomSuccess.createSuccess(
//         { comments: await Promise.all(commentsResource), remainingCount },
//         "Replies fetched successfully",
//         200,
//       ),
//     );
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };

import mongoose, { Types } from "mongoose";
import AuthModel from "../DB/Model/authModel.js";
import { CommentModel } from "../DB/Model/commentModel.js";
// import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import { PostModel } from "../DB/Model/postModel.js";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import UserModel from "../DB/Model/userModel.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
import { CommentResource } from "../Utils/Resource/commentResource.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
// import { topReactionsType } from "../Utils/pipelineHelpers/socialHelper.js";

export const createComment = async (req, res, next) => {
  const { id } = req.params;
  const { comment, isReply = false, mentions = [] } = req.body;
  if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
  if (!comment || comment.trim() === "") return next(CustomError.badRequest("Comment is required"));
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const mentionedUsers = await UserModel.find({ username: { $in: mentions } });
    let post, newComment, existingComment, parent;
    if (!isReply) {
      post = await PostModel.findById(id);
      if (!post) return next(CustomError.notFound("Post not found"));
      newComment = new CommentModel({
        text: comment,
        isReply: false,
        commentType: "Post",
        parent: id,
        user: req.profileId,
        mentions: mentionedUsers.map((mention) => mention._id),
        genericId: id,
      });
      post.comments.push(newComment._id);
      parent = await (await post.save()).populate({ path: "user", model: UserModel });
    } else {
      existingComment = await CommentModel.findById(id);
      if (!existingComment) return next(CustomError.notFound("Comment not found"));
      newComment = new CommentModel({
        text: comment,
        isReply: true,
        parent: id,
        commentType: "Comment",
        user: req.profileId,
        genericId: existingComment.genericId,
      });
      existingComment.replies.push(newComment._id);

      parent = await (await existingComment.save()).populate({ path: "user", model: UserModel });
    }
    const savedComment = await newComment.save().then((comment) => {
      return comment.populate([
        {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
          },
        },
      ]);
    });
    const user = await AuthModel.findOne({ profile: req.profileId })
      .populate([
        {
          path: "profile",
          model: UserModel,
          select: ["userName", "image"],
          populate: {
            path: "image",
          },
        },
      ])
      .lean();

    const devices = await DeviceSettingModel.find({
      auth: parent.user.auth.toString(),
      isNotificationOn: true,
    }).lean();

    if (devices && devices.length > 0) {
      const message = isReply ? "replied to your comment" : "commented on your post";
      const notification = {
        title: `@${user.profile.userName} ${message}`,
        body: `@${user.profile.userName} ${message}`,
        genericId: newComment.genericId,
        data: {
          type: "comment",
          comment: savedComment._id.toString(),
          userImage:
            user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
        },
      };
      const _devices = devices.map((device) => {
        const {deviceToken}  = device
          ? device
          : {
              deviceToken: null,
            };
        if (deviceToken) {
         return sendNotificationWithPayload({
         token: deviceToken,
            ...notification,
          });
        } else {
          return new Promise(() => true);
        }
      });

      notification.payload = {
        type: "comment",
        comment: savedComment._id,
        userImage:
          user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
      };
      delete notification.data;
      const newNotification = new NotificationModel({
        ...notification,
        auth: parent.user.auth.toString(),
        payload: {
          type: "comment",
          comment: savedComment._id,
          userImage:
            user.profile.image && user.profile.image.mediaUrl ? user.profile.image.mediaUrl : null,
        },
      });
      console.log(newNotification, "newNotification***")
      await Promise.all([..._devices, newNotification.save()]);
    }

    const commentResource = new CommentResource(savedComment);
    return next(
      CustomSuccess.createSuccess(
        commentResource,
        `${isReply ? "Replied" : "Commented"} successfully`,
        201,
      ),
    );
  } catch (error) {
    await session.abortTransaction();
    return next(CustomError.internal(error.message));
  } finally {
    await session.endSession();
  }
};

export const updateComment = async (req, res, next) => {
  const { id } = req.params;
  const { comment } = req.body;
  if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
  if (!comment || comment.trim() === "") return next(CustomError.badRequest("Comment is required"));
  try {
    const commentDb = await CommentModel.findOneAndUpdate(
      {
        _id: id,
        user: req.profileId,
      },
      {
        text: comment,
        isEdited: true,
      },
      {
        new: true,
      },
    ).populate([
      {
        path: "user",
        populate: {
          path: "image",
        },
      },
    ]);
    if (!commentDb) return next(CustomError.notFound("Comment not found"));
    const commentResource = new CommentResource(commentDb);
    next(CustomSuccess.createSuccess(commentResource, "comment updated successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const deleteComment = async (req, res, next) => {
  const { id } = req.params;
  console.log("req.params.id:", id);
  if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));

  try {
    // Log for debugging
    console.log('Searching for comment with id:', id);
    console.log('Profile ID:', req.profileId);

    const comment = await CommentModel.findOneAndDelete({
      _id: id,
      user: req.profileId,
    });

    // Log what MongoDB returns
    console.log("findOneAndDelete result =>", comment);

    if (!comment) {
      console.log(`Comment with ID ${id} not found for user ${req.profileId}`);
      return next(CustomError.notFound("Comment not found"));
    }

    await UserModel.findByIdAndUpdate(req.profileId, { $pull: { comments: comment._id } });
    next(CustomSuccess.createSuccess({}, "Comment deleted successfully", 201));
  } catch (error) {
    console.log("Error:", error);
    return next(CustomError.internal(error.message));
  }
};


export const commentReplies = async (req, res, next) => {
  const { id } = req.params;
  const { skip = 0, limit = 10, sortBy = "popularity" } = req.query;

  if (!id || !Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid ID"));
  }

  try {
    const pipeline = [
      { $match: { _id: mongoose.Types.ObjectId(id) } },
      { $unwind: "$replies" },
      {
        $lookup: {
          from: "comments",
          localField: "replies",
          foreignField: "_id",
          as: "replies",
        },
      },
      { $unwind: "$replies" },
      {
        $lookup: {
          from: "reactions",
          localField: "replies.reactions",
          foreignField: "_id",
          as: "replies.reactions",
        },
      },
      
      {
        $lookup: {
          from: "users",
          localField: "replies.user",
          foreignField: "_id",
          as: "replies.user",
        },
      },
      { $unwind: "$replies.user" },
      {
        $lookup: {
          from: "media",
          localField: "replies.user.image",
          foreignField: "_id",
          as: "replies.user.image",
        },
      },
      { $unwind: { path: "$replies.user.image", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$replies._id",
          replies: { $first: "$replies" },
          popularity: { $sum: { $size: "$replies.reactions" } },
          createdAt: { $first: "$replies.createdAt" },
          user: { $first: "$replies.user" },
        },
      },
    
      // {
      //   $sort: {
      //     [sortBy === "newestFirst" ? "createdAt" : "popularity"]: -1,
      //     createdAt: -1,
      //   },
      // },
      {
        $sort: {
          // [sortBy === "newestFirst" ? "createdAt" : "popularity"]: -1,
          createdAt: 1,
        },
      },
    
      {
        $facet: {
          replies: [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }],
        },
      },
      {
        $project: {
          _id: 1,
          replies: 1,
          user: {
            _id: 1,
            fullName: 1,
            userName: 1,
            image: {
              $cond: {
                if: { $eq: ["$user.image", null] },
                then: null,
                else: {
                  _id: "$user.image._id",
                  url: "$user.image.url",
                },
              },
            },
          },
          popularity: 1,
          createdAt: 1,
          reactions: 1, 
          topReactionsType: 1,
          reactions: "$replies.reactions",
        },
      },
      {
        $unwind: {
          path: "$replies",
        },
      },
    ];

    const [replies, count] = await Promise.all([
      CommentModel.aggregate(pipeline),
      CommentModel.countDocuments({ parent: mongoose.Types.ObjectId(id) }),
    ]);
    console.log("replies-------------", replies)

    const remainingCount =
      count - parseInt(skip) - replies.length ? count - parseInt(skip) - replies.length : 0;
 
    const repliesWithReactions = await Promise.all(replies.map(async (reply) => {
    const userReaction = await ReactionModel.findOne({
        parent: reply.replies.replies._id,
        user: req.profileId,
     });
    console.log("userReaction=>", userReaction)
  
      reply.replies.replies.isReacted = !!userReaction;
      reply.replies.replies.reactionType = userReaction ? userReaction.reactionType : "Like";
      return reply;
     }));
    // console.log("repliesWithReactionsrepliesWithReactions=>", repliesWithReactions)
    const repliesResource = repliesWithReactions.map((reply) => new CommentResource(reply.replies.replies));

    // const repliesResource = replies.map((reply) => new CommentResource(reply.replies.replies));
    
    return next(
      CustomSuccess.createSuccess(
        { replies: repliesResource, remainingCount },
        "Replies fetched successfully",
        200,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};



export const commentsByPost = async (req, res, next) => {
  const { id } = req.params;
  const { skip = 0, limit = 10, sortBy = "popularity" } = req.query;

  if (!id || !Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid ID"));
  }

  try {
    const pipeline = [
      { $match: { _id: mongoose.Types.ObjectId(id) } },
      { $unwind: "$comments" },
      {
        $lookup: {
          from: "comments",
          localField: "comments",
          foreignField: "_id",
          as: "comments",
        },
      },
      { $unwind: "$comments" },
      {
        $lookup: {
          from: "reactions",
          localField: "comments.reactions",
          foreignField: "_id",
          as: "comments.reactions",
        },
      },
      // {
      //   $addFields: {
      //     topReactionsType: {
      //       $let: {
      //         vars: {
      //           sortedReactions: {
      //             $map: {
      //               input: {
      //                 $setUnion: `$comments.reactions.reactionType`,
      //               },
      //               in: {
      //                 type: "$$this",
      //                 count: {
      //                   $size: {
      //                     $filter: {
      //                       input: `$comments.reactions`,
      //                       cond: {
      //                         $eq: ["$$this", "$$this.type"],
      //                       },
      //                     },
      //                   },
      //                 },
      //               },
      //             },
      //           },
      //         },
      //         in: {
      //           $map: {
      //             input: { $slice: ["$$sortedReactions", 0, 3] },
      //             in: "$$this.type",
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      {
        $addFields: {
          topReactionsType: {
            $let: {
              vars: {
                sortedReactions: {
                  $map: {
                    input: {
                      $setUnion: `$comments.reactions.reactionType`,
                    },
                    in: {
                      type: "$$this",
                      count: {
                        $size: {
                          $filter: {
                            input: `$comments.reactions`,
                            cond: {
                              $eq: ["$$this.reactionType", "$$this.type"],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              in: {
                $map: {
                  input: { $slice: ["$$sortedReactions", 0, 3] },
                  in: "$$this.type",
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.user",
          foreignField: "_id",
          as: "comments.user",
        },
      },
      { $unwind: "$comments.user" },
      {
        $lookup: {
          from: "media",
          localField: "comments.user.image",
          foreignField: "_id",
          as: "comments.user.image",
        },
      },
      { $unwind: { path: "$comments.user.image", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$comments._id",
          comments: { $first: "$comments" },
          topReactionsType: { $firstN: { input: "$topReactionsType", n: 3 } },
          popularity: { $sum: { $size: "$comments.reactions" } },
          createdAt: { $first: "$comments.createdAt" },
          user: { $first: "$comments.user" },
        },
      },
      // {
      //   $sort: {
      //     [sortBy === "newestFirst" ? "createdAt" : "popularity"]: -1,
      //     createdAt: -1,
      //   },
      // },
       {
         $sort: {
         createdAt: 1  // 1 for ascending order
         },
       },
      {
        $facet: {
          comments: [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }],
        },
      },
      {
        $project: {
          _id: 1,
          comments: 1,
          user: {
            _id: 1,
            fullName: 1,
            userName: 1,
            image: {
              $cond: {
                if: { $eq: ["$user.image", null] },
                then: null,
                else: {
                  _id: "$user.image._id",
                  url: "$user.image.url",
                },
              },
            },
          },
          popularity: 1,
          createdAt: 1,
          topReactionsType: 1,
        },
      },
      {
        $unwind: {
          path: "$comments",
        },
      },
    ];

    const [comments, count] = await Promise.all([
      PostModel.aggregate(pipeline),
      CommentModel.countDocuments({ parent: mongoose.Types.ObjectId(id) }),
    ]);

    const remainingCount =
      count - parseInt(skip) - comments.length ? count - parseInt(skip) - comments.length : 0;
    const commentsResource = comments.map(async (comment) => {
      const _comment = comment.comments.comments;

      const followers = _comment.user ? _comment.user.followers : [];

      // console.log(_comment);
      _comment.user.isFollowing = followers.toString().includes(req.profileId);
      const userReaction = await ReactionModel.findOne({
        parent: _comment._id,
        user: req.profileId,
      });
      _comment.reactionType = userReaction ? userReaction.reactionType : null;
      _comment.isReacted = !!userReaction;
      return new CommentResource(_comment);
    });

    return next(
      CustomSuccess.createSuccess(
        { comments: await Promise.all(commentsResource), remainingCount },
        "Replies fetched successfully",
        200,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
