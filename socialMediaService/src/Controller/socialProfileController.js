import mongoose from "mongoose";
import AuthModel from "../DB/Model/authModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import UserModel from "../DB/Model/userModel.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
// import { author } from "../Utils/pipelineHelpers/author.js";
import { AuthorResource } from "../Utils/Resource/authorResource.js";
import { PostProfileResource } from "../Utils/Resource/profileResource.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import _ from "lodash";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import requestVerificationModel from "../DB/Model/requestVerificationModel.js";

// VIEW PROFILE V2
export const viewProfile = async (req, res, next) => {
  const { id = req.profileId } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return next(CustomError.badRequest("Invalid ID"));
  try {
    const profile = await UserModel.findById(id).populate([
      {
        path: "image",
      },
      {
        path: "posts",
        populate: [
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
          {
            path: "originalPost",
            populate: [
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
            ],
          },
        ],
        limit: 10,
      },
    ]);

    if (!profile) return next(CustomError.notFound("Profile not found"));
    const verificationStatus = await requestVerificationModel
      .findOne({ userId: id }, "status")
      .lean();
    console.log(verificationStatus, "verificationStatus");

    if (profile.posts.length > 0) {
      var reactions = await ReactionModel.aggregate([
        {
          $match: {
            parent: {
              $in: profile.posts[0].user.posts,
            },
          },
        },
        {
          $group: {
            _id: "$parent",
            count: { $sum: 1 },
            reactionType: { $push: "$reactionType" },
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
      ]);
    }

    if (!profile) return next(CustomError.notFound("Profile not found"));
    const isFollowing = profile.followers.toString().includes(req.profileId);
    const profileResource = new PostProfileResource(
      profile,
      verificationStatus?.status ?? "not requested",
    );
    profileResource.user.isFollowing = isFollowing;
    profileResource.user.verificationStatus = verificationStatus?.status ?? "not requested";
    if (reactions?.length > 0) {
      _.map(reactions, (item) => {
        let index =
          _.findIndex(profileResource.posts, (o) => _.isEqual(o.id, item._id)) ?? undefined;
        if (index >= 0) {
          profileResource.posts[index].reactionsCount = item.count;
          let count = item.reactionType.length > 2 ? 2 : item.reactionType.length;
          profileResource.posts[index].topReactions = _.times(
            count,
            (index) => item.reactionType[index],
          );
        }
      });
    }

    return next(CustomSuccess.createSuccess(profileResource, "Profile Fetched Successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const followProfile = async (req, res, next) => {
  const { id } = req.params;
  const { follow = true } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return next(CustomError.badRequest("Invalid ID"));
  if (id == req.profileId) return next(CustomError.badRequest("You cannot follow yourself"));
  try {
    const profile = await UserModel.findById(id);
    const user = await UserModel.findById(req.profileId).populate("image").lean();
    req.user = user;

    if (!profile) return next(CustomError.notFound("Profile not found"));
    if (profile.followers.includes(req.profileId) && follow)
      return next(CustomError.badRequest("You are already following this profile"));
    if (!profile.followers.includes(req.profileId) && !follow)
      return next(CustomError.badRequest("You are not following this profile"));
    if (!follow && profile.followers.includes(req.profileId)) {
      await UserModel.findByIdAndUpdate(id, {
        $pull: { followers: req.profileId },
      });
      await UserModel.findByIdAndUpdate(req.profileId, {
        $pull: { following: id },
      });
      return next(CustomSuccess.createSuccess({}, "Profile unfollowed successfully", 200));
    }
    if (follow && !profile.followers.includes(req.profileId)) {
      profile.followers.push(req.profileId);
    }
    await profile.save();
    await UserModel.findByIdAndUpdate(req.profileId, {
      $addToSet: { following: id },
    });
    const followerId = req.profileId;
    const notificationSubjectAuthId = profile.auth;
    await new NotificationModel({
      auth: notificationSubjectAuthId,
      title: follow
        ? `@${req.user.fullName} started following you`
        : `@${req.user.fullName} unfollowed you.`,
      body: `Tap to view ${req.user.fullName}'s profile`,
      payload: {
        type: "follower",
        profileId: req.profileId,
        profileImage: req.user.image,
      },
      followerId,
    }).save();
    const { devices } = await AuthModel.findById(notificationSubjectAuthId)
      .populate({
        path: "devices",
        strictPopulate: false,
        model: DeviceModel,

        populate: {
          path: "deviceSettings",
          model: DeviceSettingModel,
          strictPopulate: false,
          match: { isNotificationOn: true },
        },
      })
      .lean();
    const promises = devices.map(async (device) => {
      return sendNotificationWithPayload({
        token: device.deviceToken,
        title: follow
          ? `@${req.user.userName} started following you`
          : `@${req.user.userName} unfollowed you.`,
        body: `Tap to view ${req.user.fullName}'s profile`,
        data: {
          type: "follower",
          profileId: req.profileId,
          profileImage: req.user.image,
        },
        postId: null,
        followerId,
      });
    });
    await Promise.all(promises);
    return next(CustomSuccess.createSuccess({}, "Profile followed successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getFollowers = async (req, res, next) => {
  const { id } = req.params;
  let { type = "followers" } = req.query;
  const { profileId = false } = req;
  console.log(profileId);
  if (type !== "followers" && type !== "following")
    return next(CustomError.badRequest("Invalid type"));
  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return next(CustomError.badRequest("Invalid ID"));
  try {
    const query = [
      // match userProfile by id
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
        },
      },
      // lookup all the followers
      {
        $lookup: {
          from: "users",
          let: { followers: `$${type}` },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$followers"],
                },
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
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: `_${type}`,
        },
      },
      {
        $unwind: {
          path: `$_${type}`,
        },
      },
      {
        $project: {
          followers: `$_${type}`,
          // isFollowing: `$_${type}.isFollowing`,
        },
      },
    ];
    const followers = UserModel.aggregate(query);
    Promise.all([followers])
      .then((data) => {
        // console.log(data);
        const followers = data[0].map((follower) => {
          console.log(follower.followers);
          return new AuthorResource(follower.followers);
        });
        return next(CustomSuccess.createSuccess(followers, `${type}  fetched successfully`, 200));
      })
      .catch((error) => {
        return next(CustomError.internal(error.message));
      });
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getUserProfiles = (req, res, next) => {
  const { contains } = req.body;
  const query = {
    $or: [
      { fullName: { $regex: contains, $options: "i" } },
      { userName: { $regex: contains, $options: "i" } },
    ],
  };
  const users = UserModel.find(query, {
    fullName: 1,
    image: 1,
    _id: 1,
    userName: 1,
  })
    .populate({
      path: "image",
      select: "mediaUrl",
    })
    .lean();

  Promise.all([users]).then(([users]) => {
    return next(CustomSuccess.createSuccess(users, "Users fetched successfully", 200));
  });
};

export const blockUserById = async (req, res, next) => {
  try {
    const profileId = req.params.id;
    console.log(typeof profileId);
    if (!profileId?.length || !profileId || typeof profileId !== "string") {
      return next(CustomError.createError("User Profile Id is required", 400));
    }

    const user = await UserModel.findOne({ _id: profileId });

    if (!user) {
      return next(CustomError.createError("No User found", 404));
    }
    const updateBlockList = await UserModel.findOneAndUpdate(
      {
        _id: req.profileId,
      },
      {
        $addToSet: {
          blockedUsers: profileId,
        },
      },
      {
        new: true,
      },
    );
    console.log(updateBlockList);

    return next(new CustomSuccess(null, "User Blocked successfully", 200));
  } catch (error) {
    console.log(error);
    return next(CustomError.internal("Something went wrong"));
  }
};

export const getAllUserProfile = async (req, res, next) => {
  const searchInput = req.query.searchInput;
  console.log(searchInput, "query username");
  if (!searchInput) {
    return res.status(400).json({ message: "Query must be provided" });
  }
  try {
    const users = await UserModel.find({
      $or: [
        { userName: { $regex: new RegExp(searchInput), $options: "i" } },
        { fullName: { $regex: new RegExp(searchInput), $options: "i" } },
      ],
    }).populate("image");
    if (users.length === 0) {
      return next(CustomError.createError("No User found", 404));
    }
    const userWithImageUrl = users.map((user) => {
      const { image, ...rest } = user.toObject();
      return {
        ...rest,
        imageUrl: image ? "http://scribbleapi.s3.us-east-1.amazonaws.com/" + image.mediaUrl : null,
      };
    });
    console.log(userWithImageUrl, "userWithImageUrl*****");
    return next(CustomSuccess.createSuccess(userWithImageUrl, "Users fetched successfully", 200));
  } catch (error) {
    console.log(error);
    return next(CustomError.createError(error.message), 500);
  }
};
