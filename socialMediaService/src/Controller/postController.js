import { PostModel } from "../DB/Model/postModel.js";
import MediaModel from "../DB/Model/media.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import { uid } from "uid/secure";
import ffmpeg from "fluent-ffmpeg";
import mongoose from "mongoose";
import axios from "axios";
import { fileFromPathSync } from "formdata-node/file-from-path";
import { config } from "dotenv";
import { unlink } from "fs";
import { FormData } from "formdata-node";
import UserModel from "../DB/Model/userModel.js";
import { PostResource } from "../Utils/Resource/postResource.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import { CommentModel } from "../DB/Model/commentModel.js";
import { postAttachments } from "../Utils/pipelineHelpers/postAttachments.js";
import { author } from "../Utils/pipelineHelpers/author.js";
import {
  additionalMetaFields,
  onlyPostContent,
  reactions,
} from "../Utils/pipelineHelpers/socialHelper.js";
import { ReportedPostModel } from "../DB/Model/reportedPostModel.js";
import { reportModel } from "../DB/Model/reportModel.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";

config();

export const createPost = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { caption } = req.body;
    const attachments =
      req.files && req.files.attachments && req.files.attachments.length > 0
        ? req.files.attachments.map((file) => {
            const mediaType = file.mimetype.split("/")[0];
            if (mediaType == "video") {
              return {
                mediaType: mediaType,
                thumbnailUrl: file.thumbnailPath
                  ? "public/uploads/thumbnails/" + file.thumbnailPath
                  : null,
                mediaUrl: "public/uploads/" + file.mediaPath,
                profile: req.profileId,
                userType: "User",
              };
            } else {
              return {
                mediaType: mediaType,
                thumbnailUrl: null,
                mediaUrl: file.image,
                profile: req.profileId,
                userType: "User",
              };
            }
          })
        : [];
    if (attachments.length > 0) {
      const post = new PostModel({ caption, user: req.profileId, attachments });
      const savedAttachments = await MediaModel.insertMany(attachments, { session });
      console.log(savedAttachments);
      post.attachments = savedAttachments.map(({ _id }) => _id);

      await UserModel.findByIdAndUpdate(
        req.profileId,
        { $addToSet: { posts: post._id } },
        { session },
      );
      const savedPost = await (
        await post.save({ session })
      ).populate([
        {
          path: "attachments",
        },
        {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
          },
        },
      ]);
      // const postResource = new PostResource(savedPost);
      // console.log(postResource
      await session.commitTransaction();

      return next(new CustomSuccess(savedPost, "Post created successfully", 201));
    } else {
      const post = new PostModel({ caption, user: req.profileId });
      await UserModel.findByIdAndUpdate(
        req.profileId,
        { $addToSet: { posts: post._id } },
        { session },
      );
      const savedPost = await (
        await post.save({ session })
      ).populate([
        {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
          },
        },
      ]);
      const postResource = new PostResource(savedPost);
      await session.commitTransaction();
      return next(new CustomSuccess(postResource, "Post created successfully", 201));
    }
  } catch (error) {
    await session.abortTransaction();
    return next(CustomError.internal(error.message));
  } finally {
    session.endSession();
  }
};

export const getPostById = async (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return next(CustomError.badRequest("invalid Post id"));

  try {
    const post = await PostModel.findById(id)
      .populate({
        path: "user",
        model: UserModel,
        populate: {
          path: "image",
        },
      })
      .populate("attachments")
      .populate({
        path: "reactions",
        model: ReactionModel,
      })
      .populate({
        path: "comments",
        model: CommentModel,
        populate: [
          {
            path: "replies",
            populate: [
              {
                path: "user",
                model: UserModel,
                populate: {
                  path: "image",
                },
              },
              {
                path: "reactions",
                model: ReactionModel,
              },
            ],
          },
        ],
      })
      .populate({
        path: "originalPost",
        populate: [
          {
            path: "user",
            model: UserModel,
            populate: {
              path: "image",
            },
          },
          {
            path: "attachments",
          },
        ],
      })
      .lean({ virtuals: true });
    if (!post) {
      return next(CustomError.notFound("Post not found"));
    }
    post.topComments = await post.topComments;
    const postResource = new PostResource(post);
    return next(new CustomSuccess([postResource], "Post found successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const updatePost_V2 = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;

    const { caption, postId, existingAttachments = [] } = req.body;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return next(CustomError.badRequest("Invalid post id"));
    }
    const serviceUrl = process.env.MULTIPLE_UPLOAD_URL;
    const thumbnailService = process.env.THUMBNAIL_URL;
    if (!serviceUrl) throw new CustomError("Service url not found", 500);
    if (!thumbnailService) throw new CustomError("Thumbnail service url not found", 500);
    const thumbnailUrls = [];
    const thumbnailsReadArray = [];
    const readArray = [];

    const attachments =
      req.files && req.files.attachments && req.files.attachments.length > 0
        ? req.files.attachments.map((file) => {
            const mediaType = file.mimetype.split("/")[0];
            const mediaUrl = `public/uploads/${file.filename}`;
            let thumbnailUrl = null;
            if (mediaType === "video") {
              const thumbnailName = `${uid(16)}.jpg`;
              thumbnailUrl = `./public/uploads/thumbnails/${thumbnailName}`;
              ffmpeg("./" + mediaUrl)
                .on("end", () => {
                  const readBuffer = fileFromPathSync(
                    `./public/uploads/thumbnails/${thumbnailName}`,
                    thumbnailName,
                    {
                      type: "image/jpeg",
                    },
                  );
                  const temp = {};
                  temp.fieldname = "thumbnails";
                  temp.filename = thumbnailName;
                  temp.buffer = readBuffer;
                  thumbnailsReadArray.push(temp);
                  if (thumbnailsReadArray.length === thumbnailUrls.length) {
                    const headers = {
                      "Content-Type": `multipart/form-data;`,
                    };
                    const formData = new FormData();
                    thumbnailsReadArray.forEach((file) => {
                      formData.append(file.fieldname, file.buffer, file.filename);
                    });
                    axios
                      .post(thumbnailService, formData, {
                        headers,
                      })
                      .then(() => {
                        // console.log(response);
                        console.log("thumbnail uploaded");
                        thumbnailUrls.forEach(async (url) => {
                          await unlink(url).catch((err) => console.log(err));
                        });
                      })
                      .catch((error) => {
                        console.log(error);
                        return next(new CustomError("Error while uploading thumbnail", 500));
                      });
                  }
                })
                .on("error", (err) => {
                  console.error(err);
                  session.abortTransaction();
                  return next(new CustomError("Error while creating thumbnail", 500));
                })
                .screenshots(
                  {
                    count: 1,
                    filename: thumbnailName,
                  },
                  `public/uploads/thumbnails/`,
                );

              thumbnailUrls.push(thumbnailUrl);
            }

            const readBuffer = fileFromPathSync(file.path, file.filename, {
              type: file.mimetype,
            });

            file.fieldname = "media";
            const temp = file;
            temp.buffer = readBuffer;
            readArray.push(temp);
            return {
              mediaType,
              thumbnailUrl: thumbnailUrl ? thumbnailUrl.replace("./", "") : null,
              mediaUrl,
              profile: req.profileId,
              userType: "User",
            };
          })
        : [];
    const headers = {
      "Content-Type": `multipart/form-data;`,
    };
    const formData = new FormData();
    readArray.forEach((file) => {
      formData.append(file.fieldname, file.buffer, file.filename);
    });
    await axios
      .post(serviceUrl, formData, {
        headers: headers,
      })
      .catch((err) => {
        return next(CustomError.internal(err.message));
      });

    const newAttachments = [];
    let updatedCaption = "";
    if (attachments.length > 0) {
      console.log(attachments);
      const savedAttachments = await MediaModel.insertMany(attachments, { session });
      newAttachments.push(...savedAttachments.map((attachment) => attachment._id.toString()));
    }
    if (existingAttachments.length > 0) {
      console.log(existingAttachments);
      console.log(newAttachments);
      newAttachments.push(...existingAttachments);
      console.log(newAttachments);
    }

    if (caption) {
      updatedCaption = caption;
    }

    const updateObj = {
      $set: {
        caption: updatedCaption,
        attachments: newAttachments,
        isEdited: true,
      },
    };

    const post = await PostModel.findOneAndUpdate(
      {
        _id: postId,
        user: userId,
      },
      updateObj,
      {
        new: true,
      },
    )
      .populate({
        path: "user",
        model: UserModel,
        populate: {
          path: "image",
        },
      })
      .populate("attachments")
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
          },
        },
      })
      .lean();

    if (!post) {
      return next(CustomError.notFound("Post not found"));
    }

    const postResource = new PostResource(post);
    session.commitTransaction();
    return next(CustomSuccess.createSuccess(postResource, "Post updated successfully", 200));
  } catch (error) {
    session.abortTransaction();
    return next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return next(CustomError.badRequest("Invalid post id"));
    }
    const { caption, deleted_ids } = req.body;
    const deletedMediaId = deleted_ids && deleted_ids.length > 0 ? deleted_ids : [];
    if (!caption) {
      return next(CustomError.badRequest("Caption is required"));
    }
    const post = await PostModel.findOneAndUpdate(
      {
        _id: postId,
        user: userId,
      },
      {
        caption,
        isEdited: true,
        $pull: {
          attachments: {
            $in: deletedMediaId,
          },
        },
      },
      {
        new: true,
      },
    )
      .populate({
        path: "user",
        model: UserModel,
        populate: {
          path: "image",
        },
      })
      .populate("attachments")
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
          },
        },
      })
      .lean();

    if (!post) {
      return next(CustomError.notFound("Post not found"));
    }

    const postResource = new PostResource(post);
    return next(CustomSuccess.createSuccess(postResource, "Post updated successfully", 200));
  } catch (error) {
    return next(error);
  }
};

export const deletePost = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const post = await PostModel.findOneAndDelete({
      _id: postId,
      user: userId,
    });

    if (!post) {
      await session.commitTransaction();
      session.endSession();
      return next(CustomError.notFound("Post not found"));
    }
    await UserModel.findOneAndUpdate({ _id: userId }, { $pull: { posts: postId } }, { session });

    await NotificationModel.deleteMany({ genericId: postId }, { session });
    const commentIds = await CommentModel.find({
      genericId: postId,
    }).select("_id");
    commentIds.map(async (e) => {
      await NotificationModel.deleteOne({ genericId: e._id });
    });

    await session.commitTransaction();
    session.endSession();
    return next(CustomSuccess.createSuccess({}, "Post deleted successfully", 200));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(CustomError.internal(error.message));
  }
};

//  get All post API
export const getPosts = async (req, res, next) => {
  console.log("getpostsssssssssssss called");
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    console.log("page", page, "limit", limit, typeof page, typeof limit);
    const skip = (page - 1) * limit;
    const { profileId = false } = req;

    const findUser = await UserModel.findOne({ _id: req.profileId });
    if (!findUser) {
      return next(CustomError.notFound("User not found"));
    }

    const posts = await PostModel.aggregate([
      {
        $match: {
          user: {
            $nin: findUser?.blockedUsers?.length
              ? findUser?.blockedUsers?.map((item) => mongoose.Types.ObjectId(item.toString()))
              : [],
          },
          _id: {
            $nin: findUser?.hiddenPosts?.length
              ? findUser?.hiddenPosts?.map((item) => mongoose.Types.ObjectId(item.toString()))
              : [],
          },
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "parent",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },

      {
        $lookup: {
          from: "requestverifications",
          localField: "userData._id",
          foreignField: "userId",
          as: "verificationData",
        },
      },

      ...postAttachments({
        localField: "attachments",
        returnAs: "_attachments",
      }),
      ...author({
        localField: "user",
        foreignField: "_id",
        returnAs: "user",
        profileId,
      }),
      ...reactions({
        localField: "_id",
        foreignField: "parent",
        returnAs: "reactions",
        profileId,
      }),
      ...additionalMetaFields({
        reactions: "reactions",
        comments: "comments",
      }),
      ...onlyPostContent({
        localField: "originalPost",
        foreignField: "_id",
        returnAs: "_originalPost",
        blockedUsers: findUser?.blockedUsers?.length ? findUser?.blockedUsers : [],
        hiddenPosts: findUser?.hiddenPosts?.length ? findUser?.hiddenPosts : [],
      }),
      ...author({
        localField: "_originalPost.user",
        foreignField: "_id",
        returnAs: "_originalPost.user",
        profileId,
      }),
      ...postAttachments({
        localField: "_originalPost.attachments",
        returnAs: "_originalPost.attachments",
      }),
      ...reactions({
        localField: "originalPost._id",
        foreignField: "parent",
        returnAs: "originalPost.reactions",
        profileId,
      }),
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$verificationData",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $unwind: "$user" },
      { $unwind: { path: "$_originalPost.user" } },
      {
        $project: {
          _id: 1,
          id: { $toString: "$_id" },
          caption: 1,
          user: {
            _id: { $toString: "$user._id" },
            userName: "$user.userName",
            fullName: "$user.fullName",
            image: "$user.image",
            isFollowing: "$user.isFollowing",
            verificationStatus: {
              $ifNull: ["$verificationData.status", "not-requested"],
            },
          },
          topReactionsType: 1,
          isReacted: 1,
          userReactionType: 1,
          popularity: {
            $sum: ["$reactionsCount", "$commentsCount"],
          },
          attachments: "$_attachments",
          createdAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" },
          },
          updatedAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$updatedAt" },
          },
          isEdited: 1,
          reactionsCount: 1,
          commentsCount: 1,
          topComments: "$topComments",
          reactions: "$reactions",
          isShared: 1,
          originalPost: {
            $cond: {
              if: { $and: [{ $eq: ["$isShared", true] }, { $ne: ["$_originalPost", null] }] },
              then: {
                caption: "$_originalPost.caption",
                user: {
                  _id: { $toString: "$_originalPost.user._id" },
                  userName: "$_originalPost.user.userName",
                  fullName: "$_originalPost.user.fullName",
                  image: "$_originalPost.user.image",
                },
                attachments: "$_originalPost.attachments",
                createdAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$_originalPost.createdAt",
                  },
                },
                updatedAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$_originalPost.updatedAt",
                  },
                },
                isEdited: "$_originalPost.isEdited",
                //                 reactionsCount: {
                //                   $cond:
                //                   {
                //                     if: {
                //                       $eq: [ "$_originalPost.reactions",[] ]
                //                     }, then: { $size: "$_originalPost.reactions" }
                //                   }
                // },
                //                 commentsCount: { $size: "$_originalPost.comments" },
                topComments: "$_originalPost.topComments",
                id: { $toString: "$_originalPost._id" },
                isShared: "$_originalPost.isShared",
                originalPost: "$_originalPost.originalPost",
              },
              else: null,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(skip) ? parseInt(skip) : 0 },
      { $limit: parseInt(limit) ? parseInt(limit) : 10 },
    ]);
    if (!posts) {
      return next(CustomError.notFound("Posts not found"));
    }
    console.log("Posts=>", posts[0]);
    const postsResource = posts.map((post) => new PostResource(post));
    return next(CustomSuccess.createSuccess(postsResource, "Posts fetched successfully", 200));
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const getPostByUser = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return next(CustomError.badRequest("Invalid user id"));
  }
  const { profileId } = req;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  try {
    let posts = await PostModel.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
        },
      },
      ...postAttachments({
        localField: "attachments",
        returnAs: "_attachments",
      }),
      ...author({
        localField: "user",
        foreignField: "_id",
        returnAs: "user",
        profileId,
      }),
      ...reactions({
        localField: "_id",
        foreignField: "parent",
        returnAs: "reactions",
        profileId,
      }),
      ...additionalMetaFields({
        reactions: "reactions",
        comments: "comments",
      }),
      ...onlyPostContent({
        localField: "originalPost",
        foreignField: "_id",
        returnAs: "_originalPost",
      }),
      ...author({
        localField: "_originalPost.user",
        foreignField: "_id",
        returnAs: "_originalPost.user",
        profileId,
      }),

      ...postAttachments({
        localField: "_originalPost.attachments",
        returnAs: "_originalPost.attachments",
      }),
      ...reactions({
        localField: "originalPost._id",
        foreignField: "parent",
        returnAs: "originalPost.reactions",
        profileId,
      }),

      // unwind user array
      { $unwind: "$user" },
      // unwind originalPost.user array
      { $unwind: { path: "$_originalPost.user" } },

      // project the desired fields
      {
        $project: {
          _id: 1,
          id: { $toString: "$_id" },
          caption: 1,
          user: {
            _id: { $toString: "$user._id" },
            userName: "$user.userName",
            fullName: "$user.fullName",
            image: "$user.image",
            isFollowing: "$user.isFollowing",
          },
          topReactionsType: 1,
          isReacted: 1,
          userReactionType: 1,
          popularity: {
            $sum: ["$reactionsCount", "$commentsCount"],
          },
          attachments: "$_attachments",
          createdAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" },
          },
          updatedAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$updatedAt" },
          },
          isEdited: 1,
          reactionsCount: 1,
          commentsCount: 1,
          topComments: "$topComments",
          reactions: "$reactions",
          isShared: 1,
          originalPost: {
            $cond: {
              if: { $eq: ["$isShared", true] },
              then: {
                caption: "$_originalPost.caption",
                user: {
                  _id: { $toString: "$_originalPost.user._id" },
                  userName: "$_originalPost.user.userName",
                  fullName: "$_originalPost.user.fullName",
                  image: "$_originalPost.user.image",
                },
                attachments: "$_originalPost.attachments",
                createdAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$_originalPost.createdAt",
                  },
                },
                updatedAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$_originalPost.updatedAt",
                  },
                },
                isEdited: "$_originalPost.isEdited",

                topComments: "$_originalPost.topComments",
                id: { $toString: "$_originalPost._id" },
                isShared: "$_originalPost.isShared",
                originalPost: "$_originalPost.originalPost",
              },
              else: null,
            },
          },
        },
      },
      // { $sort: { popularity: -1, createdAt: -1 } },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(skip) ? parseInt(skip) : 0 },
      { $limit: parseInt(limit) ? parseInt(limit) : 10 },
    ]);
    if (!posts) {
      return next(CustomError.notFound("Posts not found"));
    }
    // posts = posts.sort((a,b) => {
    //   return new Date(b.updatedAt) - new Date(a.updatedAt);
    // });
    const postsResource = posts.map((post) => new PostResource(post));
    return next(CustomSuccess.createSuccess(postsResource, "Posts fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// export const sharePost = async (req, res, next) => {
//   const { postId } = req.params;
//   if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
//     return next(CustomError.badRequest("Invalid post id"));
//   }
//   const { caption = "" } = req.body;
//   const userId = req.user._id;
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const sharedPost = new PostModel({
//       caption,
//       user: userId,
//       originalPost: postId,
//       isShared: true,
//     });
//     await PostModel.findOneAndUpdate(
//       {
//         _id: postId,
//       },
//       {
//         $inc: {
//           shares: 1,
//         },
//         $addToSet: {
//           sharedPosts: sharedPost._id,
//         },
//       },
//     );
//     await UserModel.findOneAndUpdate(
//       {
//         _id: userId,
//       },
//       {
//         $addToSet: {
//           posts: sharedPost._id,
//         },
//       },
//       {
//         session,
//       },
//     );
//     const savedPost = await (
//       await sharedPost.save({ session })
//     ).populate([
//       {
//         path: "user",
//         model: UserModel,
//         populate: {
//           path: "image",
//         },
//       },
//       { path: "attachments" },
//       {
//         path: "reactions",
//         model: ReactionModel,
//       },
//       {
//         path: "comments",
//         model: CommentModel,
//         populate: {
//           path: "replies",
//           populate: {
//             path: "user",
//             model: UserModel,
//             populate: {
//               path: "image",
//             },
//           },
//         },
//       },
//       {
//         path: "originalPost",
//         populate: [
//           {
//             path: "user",
//             model: UserModel,
//             populate: {
//               path: "image",
//             },
//           },
//           {
//             path: "attachments",
//           },
//         ],
//       },
//     ]);
//     const postResource = new PostResource(savedPost);
//     await session.commitTransaction();
//     return next(CustomSuccess.createSuccess(postResource, "Post shared successfully", 200));
//   } catch (error) {
//     await session.abortTransaction();
//     return next(CustomError.internal(error.message));
//   } finally {
//     session.endSession();
//   }
// };

// Share Post with notification v2
export const sharePost = async (req, res, next) => {
  const { postId } = req.params;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return next(CustomError.badRequest("Invalid post id"));
  }
  const { caption = "" } = req.body;
  const userId = req.user._id;
  const session = await mongoose.startSession();
  session.startTransaction();
  const sharingUser = await UserModel.findById(userId);
  try {
    const sharedPost = new PostModel({
      caption,
      user: userId,
      originalPost: postId,
      isShared: true,
    });
    const originalPost = await PostModel.findOneAndUpdate(
      {
        _id: postId,
      },
      {
        $inc: {
          shares: 1,
        },
        $addToSet: {
          sharedPosts: sharedPost._id,
        },
      },
    );
    console.log("orignalPost=>", originalPost);
    if (!originalPost) {
      throw new Error("Original post not found");
    }

    await UserModel.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $addToSet: {
          posts: sharedPost._id,
        },
      },
      {
        session,
      },
    );

    const savedPost = await (
      await sharedPost.save({ session })
    ).populate([
      {
        path: "user",
        model: UserModel,
        populate: {
          path: "image",
        },
      },
      { path: "attachments" },
      {
        path: "reactions",
        model: ReactionModel,
      },
      {
        path: "comments",
        model: CommentModel,
        populate: {
          path: "replies",
          populate: {
            path: "user",
            model: UserModel,
            populate: {
              path: "image",
            },
          },
        },
      },
      {
        path: "originalPost",
        populate: [
          {
            path: "user",
            model: UserModel,
            populate: {
              path: "image",
            },
          },
          {
            path: "attachments",
          },
        ],
      },
    ]);
    const postResource = new PostResource(savedPost);

    const originalUser = await UserModel.findById(originalPost.user);
    // console.log("originalUser=>", originalUser);
    // console.log("sharingUser=>", sharingUser);
    if (originalUser && sharingUser) {
      const sharingUserName = sharingUser.fullName || "Your";
      const title = `${sharingUserName} shared your post`;
      const body = "Tap to view it now.";
      const payload = {
        type: "post",
        postId: savedPost._id,
        postContent: savedPost.caption,
      };

      const devices = await DeviceSettingModel.find({
        auth: originalUser.auth.toString(),
        isNotificationOn: true,
      }).lean();
      // console.log("DEVICESSSSSSSSSSSSSSSSS=>", devices);

      if (devices && devices.length > 0) {
        const deviceTokens = devices.map((device) => {
          const token = device?.deviceToken;
          if (!token) {
            return new Promise((resolve) => resolve(true));
          }
          console.log("token=>", token);
          return sendNotificationWithPayload({
            token,
            title,
            body,
            data: payload,
            genericId: savedPost._id,
            followerId: null,
          });
        });
        await Promise.all(deviceTokens);
      }

      const newNotification = new NotificationModel({
        title,
        body,
        payload,
        genericId: savedPost._id,
        auth: originalUser.auth,
      });
      console.log("newNotification=>", newNotification);
      await Promise.all([devices, newNotification.save()]);
    }

    await session.commitTransaction();
    return next(CustomSuccess.createSuccess(postResource, "Post shared successfully", 200));
  } catch (error) {
    await session.abortTransaction();
    return next(CustomError.internal(error.message));
  } finally {
    session.endSession();
  }
};

export const reportPost = async (req, res, next) => {
  const { postId, reason, additionalInfo = "" } = req.body;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return next(CustomError.badRequest("Invalid post id"));
  }

  const userId = req.profileId;
  try {
    const post = await PostModel.findOne({
      _id: postId,
    });
    if (!post) {
      return next(CustomError.notFound("Post not found"));
    }
    const checkDuplicatePostReport = await reportModel.findOne({
      post: postId,
      reporter: {
        $in: [userId],
      },
    });
    if (checkDuplicatePostReport) {
      return next(CustomError.badRequest("Post already reported"));
    }
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          hiddenPosts: postId,
        },
      },
      {
        new: true,
        lean: true,
      },
    );
    if (!user) {
      return next(CustomError.notFound("User not found"));
    }
    const report = new reportModel({
      post: postId,
      reporter: userId,
      reason,
      additionalInfo,
    });
    const reportedPost = ReportedPostModel.findOneAndUpdate(
      {
        post: postId,
      },
      {
        $addToSet: {
          reports: report._id,
        },
        $set: {
          isApproved: false,
          isRejected: false,
        },
      },
      {
        upsert: true,
      },
    );

    return await Promise.all([report.save(), reportedPost])
      .then(() => {
        return next(CustomSuccess.createSuccess({}, "Post reported successfully", 200));
      })
      .catch((error) => {
        console.log(error);

        return next(CustomError.internal(error.message));
      });
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const hidePost = async (req, res, next) => {
  const { postId } = req.body;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return next(CustomError.badRequest("Invalid post id"));
  }
  const profileId = req.profileId;
  try {
    const user = await UserModel.findByIdAndUpdate(
      profileId,
      {
        $addToSet: {
          hiddenPosts: postId,
        },
      },
      {
        new: true,
        lean: true,
      },
    );
    if (!user) {
      return next(CustomError.notFound("User not found"));
    }
    return next(CustomSuccess.createSuccess({}, "Post hidden successfully", 200));
  } catch (err) {
    return next(CustomError.internal(err.message));
  }
};
