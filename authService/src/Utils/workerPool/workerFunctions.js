import { linkUserDevice } from "../linkUserDevice.js";
import * as WorkerPool from "workerpool";
import { connectDB } from "../../DB/index.js";
import { compare } from "bcrypt";
import { uploadSingleImage } from "../MultipartData.js";
import mongoose from "mongoose";
import UserModel from "../../DB/Model/userModel.js";
import MediaModel from "../../DB/Model/media.js";

const offloadLinkUserDevice = async ({ authId, deviceToken, deviceType }) => {
  await connectDB();
  await linkUserDevice(authId, deviceToken, deviceType);
  await mongoose.connection.close();
  return true;
};
const offloadPasswordComparisons = async ({ password, hash }) => {
  return await compare(password, hash);
};
const offloadUploadMediaToS3 = async ({ req, res, next }) => {
  return uploadSingleImage.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ])(req, res, next);
};
const offloadUpdateProfile = async ({ updateObj, profileId, mediaId = null, mediaUrl = null }) => {
  await connectDB();
  const session = await mongoose.startSession().catch((err) => {
    console.log(err);
    return { error: "Internal server error" };
  });
  session.startTransaction();
  try {
    const profile = UserModel.findByIdAndUpdate(profileId, updateObj, {
      session,
      new: true,
      lean: true,
    });
    let media = null;
    if (mediaUrl) {
      media = MediaModel.findByIdAndUpdate(
        mediaId,
        { mediaUrl: mediaUrl, mediaType: "image", userType: "User", profile: profileId },
        { session, new: true, lean: true, upsert: true },
      );
    }
    if (media === null) {
      media = async () => {
        return true;
      };
    }
    await Promise.all([profile, media])
      .then(async (values) => {
        session.commitTransaction();
        session.endSession();
        console.log(values);
        await mongoose.connection.close();
      })
      .catch(async (err) => {
        console.log(err);
        await mongoose.connection.close();
        return { error: "Internal server error" };
      });

    return true;
  } catch (e) {
    console.log(e);
    await mongoose.connection.close();
    return { error: "Internal server error" };
  }
};

WorkerPool.worker({
  offloadLinkUserDevice,
  offloadPasswordComparisons,
  offloadUploadMediaToS3,
  offloadUpdateProfile,
});
