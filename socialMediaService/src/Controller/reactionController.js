import mongoose, { Types } from "mongoose";
import AuthModel from "../DB/Model/authModel.js";
import { CommentModel } from "../DB/Model/commentModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import MediaModel from "../DB/Model/media.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import { PostModel } from "../DB/Model/postModel.js";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import UserModel from "../DB/Model/userModel.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";

export const createReaction = async (req, res, next) => {
  const { id } = req.params;
  const { reaction, reactionOn } = req.body;
  const allowedReactions = ["Like", "Love", "Haha", "Wow", "Sad", "Angry"];
  if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
  if (!reaction || reaction.trim() === "")
    return next(CustomError.badRequest("Reaction is required"));
  if (!allowedReactions.includes(reaction))
    return next(
      CustomError.badRequest(
        "Invalid Reaction Type. Allowed reactions are: Like, Love, Haha, Wow, Sad, Angry",
      ),
    );
  if (
    !reactionOn ||
    reactionOn.trim() === "" ||
    (reactionOn !== "Post" && reactionOn !== "Comment")
  )
    return next(CustomError.badRequest("ReactionOn is required"));
  const session = await mongoose.startSession();
  session.startTransaction();
  let parent;
  try {
    const reactionDb = await ReactionModel.findOneAndUpdate(
      {
        reactionOn,
        parent: id,
        user: req.profileId,
      },
      { reactionOn, parent: id, user: req.profileId, reactionType: reaction },
      {
        new: true,
        upsert: true,
      },
    );
    if (!reactionDb) return next(CustomError.internal("Something went wrong"));
    if (reactionOn === "Post") {
      parent = await PostModel.findByIdAndUpdate(id, {
        $addToSet: {
          reactions: reaction._id,
        },
      })
        .populate([
          {
            path: "user",
            model: UserModel,
            populate: {
              path: "auth",
              model: AuthModel,
              select: "devices",
              populate: {
                path: "devices",
                model: DeviceModel,
                populate: {
                  path: "deviceSetting",
                  model: DeviceSettingModel,
                  match: { isNotificationOn: true },
                },
              },
            },
          },
        ])
        .lean();
    }
    if (reactionOn === "Comment") {
      parent = await CommentModel.findByIdAndUpdate(id, {
        $addToSet: {
          reactions: reactionDb._id,
        },
      })
        .populate([
          {
            path: "user",
            model: UserModel,
            populate: {
              path: "auth",
              model: AuthModel,
              select: "devices",
              populate: {
                path: "devices",
                model: DeviceModel,
                populate: {
                  path: "deviceSetting",
                  model: DeviceSettingModel,
                  match: { isNotificationOn: true },
                },
              },
            },
          },
        ])
        .lean();
    }

    const user = await UserModel.findByIdAndUpdate(req.profileId, {
      $addToSet: {
        reactions: reactionDb._id,
      },
    }).populate({
      path: "image",
      model: MediaModel,
    });
    if (!user) throw new Error("Something went wrong");
    const title = reactionOn === "Comment" ? `@${user.userName} ${reaction} on your ${reactionOn}` : 
     `@${user.userName} reacted ${reaction} on your ${reactionOn}`;
    const body = `tap to see the ${reactionOn}`;
    const auth = parent.user.auth._id;
     const genericId = reactionOn == "Comment" ? parent.genericId : parent._id;  // post id
    
    const payload = {
      type: "reaction",
      id: parent._id,
      reaction,
      userName: user.userName,
      userImage: user.image ? user.image.mediaUrl : "public/uploads/default.png",
    };
    if (parent.user.auth && parent.user.auth.devices && parent.user.auth.devices.length > 0) {
      const devices = parent.user.auth.devices.filter((device) => {
        if (device.deviceSetting) {
          return device.deviceSetting.isNotificationOn;
        } else {
          false;
        }
      });
      if (devices.length > 0 && parent.user._id.toString() !== req.profileId.toString()) {
       console.log(parent.user, "parent.user")
      
        const notifications = devices.map(async (device) => {
          await sendNotificationWithPayload({
            title,
            body,
            token: device.deviceToken,
            data: payload,
            genericId, // post id
          });
        });
        console.log("notifications", notifications);
        await Promise.all(notifications);
      }
      // await new NotificationModel({
      //   auth,
      //   title,
      //   body,
      //   payload,
      // }).save();
      await NotificationModel.findOneAndUpdate(
        {
          auth,
          payload: {
            userName: user.userName,
          },
          genericId,
        },
        {
          $set: {
            auth,
            title,
            body,
            payload,
            genericId, // post id
          },
        },
        {
          new: true,
          upsert: true,
        },
      );
    }
    console.log("parent************", parent);
    await session.commitTransaction();
    next(CustomSuccess.createSuccess({}, `Reacted successfully on ${reactionOn}`, 201));
  } catch (error) {
    await session.abortTransaction();
    return next(CustomError.internal(error.message));
  } finally {
    session.endSession();
  }
};

export const deleteReaction = async (req, res, next) => {
  const { id } = req.params;
  const { reactionOn } = req.body;

  if (!id || !Types.ObjectId.isValid(id)) return next(CustomError.badRequest("Invalid ID"));
  if (
    !reactionOn ||
    reactionOn.trim() === "" ||
    (reactionOn !== "Post" && reactionOn !== "Comment")
  )
    return next(CustomError.badRequest("ReactionOn is required"));
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let reaction = await ReactionModel.findOneAndDelete(
      {
        reactionOn,
        parent: id,
        user: req.profileId,
      },
      {
        new: true,
      },
    );
  reaction = await ReactionModel.populate(reaction,[
  {
  path:"parent"
  },
  ]);
  const user = await UserModel.findById(reaction.parent.user);
 
     const auth = await UserModel.findByIdAndUpdate(req.profileId, {
      $pull: {
        reactions: reaction._id,
      },
    },{
     new: true});
  console.log("AUTH", auth)
    if (reactionOn === "Post") {
      await PostModel.findByIdAndUpdate(id, {
        $pull: {
          reactions: reaction._id,
        },
      });
  
     const not =  await NotificationModel.deleteOne({
        auth : user.auth,
        genericId: id,
        "payload.userName": auth.userName
      });
     
    }
    if (reactionOn === "Comment") {
     const com = await CommentModel.findByIdAndUpdate(id, {
        $pull: {
          reactions: reaction._id,
        },
      });
  //   const not = await NotificationModel.findOneAndDelete({
  //   auth : user.auth,
  // payload:{
  // id : new Types.ObjectId(id),  
  //   type:"reaction",
  //   userName : auth.userName,}
    // })
    const not =  await NotificationModel.deleteOne({
        auth : user.auth,

    "payload.type":"reaction",
    "payload.userName" : auth.userName,
    	"payload.id" : Types.ObjectId(id),
      });
   
     
    }

    await session.commitTransaction();
    return next(
      CustomSuccess.createSuccess({}, `Reaction deleted successfully on ${reactionOn}`, 200),
    );
  } catch (error) {
    await session.abortTransaction();
    return next(CustomError.internal(error.message));
  } finally {
    session.endSession();
  }
};
