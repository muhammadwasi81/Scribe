import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { generateTokenPair } from "../Utils/jwt.js";
import bcrypt, { hashSync } from "bcrypt";
import UserModel from "../DB/Model/userModel.js";
import AuthModel from "../DB/Model/authModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { genSalt } from "../Utils/saltGen.js";
import { sendEmails } from "../Utils/SendEmail.js";
import { linkUserDevice } from "../Utils/linkUserDevice.js";
import { randomInt } from "crypto";
import axiosFormData from "axios-form-data";
import {
  ForgotPasswordValidator,
  LoginValidator,
  UpdateProfileValidator,
  RegisterValidator,
  ResetPasswordValidator,
  SocialRegisterValidator,
  verifyOTPValidator,
  SocialLoginValidator,
  UserNameValidator,
} from "../Utils/Validator/userValidator.js";
import { config } from "dotenv";
import { createReadStream, unlink } from "fs";
import { accessTokenValidator } from "../Utils/accessTokenValidator.js";
import OtpModel from "../DB/Model/otpModel.js";
import MediaModel from "../DB/Model/media.js";
import { emailForAccountVerification, emailForResetPassword } from "../Utils/emailTemplates.js";
import { ResendOTPValidator } from "../Utils/Validator/userValidator.js";
// import { uploadMedia } from "../Utils/Resource/imageResource.js";
import { uid } from "uid/secure";
import { UserResource } from "../Utils/Resource/UserResource.js";
// import axios from "axios";
import workerPoolController from "../Utils/workerPool/workerPoolController.js";
import mongoose from "mongoose";
import { uploadSingleImage } from "../Utils/MultipartData.js";
import { PostModel } from "../DB/Model/postModel.js";
import { VerificationRequestModel } from "../DB/Model/verificationRequest.js";
import { uploadMedia } from "../Utils/Resource/imageResource.js";
import axios from "axios";
import { saveNetworkImage } from "../Utils/saveNetworkImage.js";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import { CommentModel } from "../DB/Model/commentModel.js";
import requestVerificationModel from "../DB/Model/requestVerificationModel.js";
// import { Readable } from "stream";
// import { date } from "joi";
// import { date } from "joi";
// import moment from 'moment';
// import ForgetPassword from '../DB/Models/ForgetPassword.js'

//register
config();

export const Register = async (req, res, next) => {
  try {
    console.time("register");
    console.time("validator");
    const { error } = RegisterValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        return next(CustomError.createError(err.message, 200));
      });
    }
    console.timeEnd("validator");

    const {
      userName,
      fullName,
      description,
      email,
      password,
      deviceType,
      deviceToken /*lat, long*/,
    } = req.body;
    // check userName is already taken
    const checkUserExist = await AuthModel.findOne({
      $or: [{ identifier: email }],
    }).select("identifier");
    if (checkUserExist) {
      return next(CustomError.createError("User already exist with this email", 200));
    }
    const auth = new AuthModel({
      identifier: email,
      password,
      userType: "User",
      // location: {
      //   type: "Point",
      //   coordinates: [parseFloat(long), parseFloat(lat)],
      // },
    });
    if (!auth) {
      return next(CustomError.createError("error registering user", 200));
    }
    // send email for otp verification
    const otp = randomInt(100000, 999999);
    const _uid = uid(16);
    const OTP = await new OtpModel({
      uid: _uid,
      auth: auth._id,
      otpKey: otp,
      reason: "verification",
    }).save();

    const emailData = emailForAccountVerification({
      otp,
      name: fullName,
      uid: _uid,
    });
    if (emailData.error) {
      return next(CustomError.createError(emailData.message, 200));
    }

    // register user device
    const userId = auth._id;
    const user = await new UserModel({
      auth: userId,
      userName,
      fullName,
      description,
    }).save();
    if (!user) {
      return next(CustomError.createError("error creating user profile", 200));
    } else {
      const profile = user._id;
      auth.OTP = OTP._id;
      auth.profile = profile;
      const updatedAuth = await auth.save();
      if (!updatedAuth) {
        return next(CustomError.createError("error creating user profile", 200));
      }
      const { error } = await linkUserDevice(updatedAuth._id, deviceToken, deviceType);
      if (error) {
        return next(CustomError.createError(error, 200));
      }
      delete user._doc.auth;
      const { hasError, message } = await sendEmails(
        email,
        emailData.subject,
        emailData.html,
        emailData.attachments,
      );
      if (hasError) {
        return next(CustomError.createError(message, 500));
      }
      return next(CustomSuccess.createSuccess({}, "user register successfully", 200));
    }
  } catch (error) {
    if (error.code === 11000) {
      console.log(error);
      if (error.keyValue.identifier) {
        return next(CustomError.createError("You already signed up using this email", 200));
      }
      return next(CustomError.createError("This Username is already taken", 200));
    }
    console.log(error);
    return next(CustomError.createError(error.message, 200));
  }
};

//social register user
export const SocialOnboarding = async (req, res, next) => {
  const { socialType, displayName, email, uid, imageUrl, deviceType, deviceToken } = req.body;
  if (!socialType || !displayName || !email || !uid || !deviceType || !deviceToken) {
    return next(CustomError.createError("Please provide all the required fields", 400));
  }
  const { ip, headers } = req;
  const forwardedIp = headers["forwarded"]
    ? headers["forwarded"].split(";")[1].replace("for=", "")
    : false;
  const userAgent = headers["user-agent"] || {};
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const checkUserExist = await AuthModel.findOne({
      identifier: email,
    }).select("identifier");
    if (checkUserExist) {
      return next(CustomError.createError("User already exist", 200));
    }
    const auth = await AuthModel.findOneAndUpdate(
      {
        identifier: uid,
      },
      {
        $setOnInsert: {
          password: email,
          userType: "User",
          socialType,
          isVerified: true,
        },
      },
      {
        new: true,
        upsert: true,
        session,
      },
    );
    if (!auth) {
      throw new Error("error registering user");
    }
    const savedImage = imageUrl ? await saveNetworkImage(imageUrl) : null;
    if (savedImage.hasError) {
      console.log(savedImage.hasError);
      throw new Error(savedImage.message);
    }
    const imageId = new MediaModel({
      mediaUrl: savedImage.image,
      mediaType: "image",
      userType: "User",
    });

    const user = await UserModel.findOneAndUpdate(
      {
        auth: auth._id,
      },
      {
        $setOnInsert: {
          userName: displayName.replaceAll(" ", "") + randomInt(1000, 9999),
          fullName: displayName,
          description: "Author",
          image: imageId._id,
        },
      },
      {
        new: true,
        upsert: true,
        session,
      },
    ).lean();
    if (!user) {
      throw new Error("error creating user profile");
    }
    const profileId = await AuthModel.findOneAndUpdate(
      {
        identifier: uid,
      },
      {
        $set: {
          profile: user._id,
        },
      },
      {
        new: true,

        session,
      },
    );
    if (!profileId) {
      throw new Error("error creating user profile");
    }
    if (!profileId) {
      throw new Error("error creating user profile");
    }
    console.log("working");
    imageId.profile = user._id;
    user.image = imageId;

    await imageId.save();
    const { authToken, refreshToken } = await generateTokenPair({
      payload: {
        uid: auth._id,
        ref: user._id,
        deviceToken,
        ip: forwardedIp ? forwardedIp : ip,
        userAgent,
      },
    });
    const profile = new UserResource(user, authToken, refreshToken).UserObject;
    const { error } = await linkUserDevice(auth._id, deviceToken, deviceType, session);
    if (error) {
      throw new Error(error);
    }
    await session.commitTransaction();
    session.endSession();

    return next(
      CustomSuccess.createSuccess(
        {
          ...profile,
          purchasedSubscriptions: auth.activeSubscription ? auth.activeSubscription : "free",
          subscriptionExpiry: auth.subscriptionExpiry ? auth.subscriptionExpiry : null,
        },
        "user register successfully",
        200,
      ),
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return next(CustomError.createError(error.message, 500));
  }
};
// export const SocialOnboarding = async (req, res, next) => {
//   const { socialType, displayName, email, uid, imageUrl, deviceType, deviceToken } = req.body;
//   if (!socialType || !displayName || !email || !uid || !deviceType || !deviceToken) {
//     return next(CustomError.createError("Please provide all the required fields", 400));
//   }
//   const { ip, headers } = req;
//   const forwardedIp = headers["forwarded"]
//     ? headers["forwarded"].split(";")[1].replace("for=", "")
//     : false;
//   const userAgent = headers["user-agent"] || {};
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const checkUserExist = await AuthModel.findOne({
//       identifier: email,
//     }).select("identifier");
//     if (checkUserExist) {
//       return next(CustomError.createError("User already exist", 200));
//     }
//     const auth = await AuthModel.findOneAndUpdate(
//       {
//         identifier: uid,
//       },
//       {
//         $setOnInsert: {
//           password: email,
//           userType: "User",
//           socialType,
//           isVerified: true,
//         },
//       },
//       {
//         new: true,
//         upsert: true,
//         session,
//       },
//     );
//     if (!auth) {
//       throw new Error("error registering user");
//     }
//     const savedImage = imageUrl ? await saveNetworkImage(imageUrl) : null;
//     if (savedImage.hasError) {
//       throw new Error(savedImage.message);
//     }
//     const imageId = new MediaModel({
//       mediaUrl: savedImage.image,
//       mediaType: "image",
//       userType: "User",
//     });

//     const user = await UserModel.findOneAndUpdate(
//       {
//         auth: auth._id,
//       },
//       {
//         $setOnInsert: {
//           userName: displayName.replaceAll(" ", "") + randomInt(1000, 9999),
//           fullName: displayName,
//           description: "Author",
//           image: imageId._id,
//         },
//       },
//       {
//         new: true,
//         upsert: true,
//         session,
//       },
//     ).lean();
//     if (!user) {
//       throw new Error("error creating user profile");
//     }
//     console.log("working");
//     imageId.profile = user._id;
//     user.image = imageId;

//     await imageId.save();
//     const { authToken, refreshToken } = await generateTokenPair({
//       payload: {
//         uid: auth._id,
//         ref: user._id,
//         deviceToken,
//         ip: forwardedIp ? forwardedIp : ip,
//         userAgent,
//       },
//     });
//     const profile = new UserResource(user, authToken, refreshToken).UserObject;
//     const { error } = await linkUserDevice(auth._id, deviceToken, deviceType, session);
//     if (error) {
//       throw new Error(error);
//     }
//     await session.commitTransaction();
//     session.endSession();

//     return next(
//       CustomSuccess.createSuccess(
//         {
//           ...profile,
//           purchasedSubscriptions: auth.activeSubscription ? auth.activeSubscription : "free",
//           subscriptionExpiry: auth.subscriptionExpiry ? auth.subscriptionExpiry : null,
//         },
//         "user register successfully",
//         200,
//       ),
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return next(CustomError.createError(error.message, 500));
//   }
// };
export const SocialRegister = async (req, res, next) => {
  try {
    const { error } = SocialRegisterValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        return next(CustomError.createError(err.message, 200));
      });
    }

    const { socialType, accessToken, deviceType, deviceToken /*lat, long*/ } = req.body;
    const { ip, headers } = req;
    const forwardedIp = headers["forwarded"]
      ? headers["forwarded"].split(";")[1].replace("for=", "")
      : false;
    const { hasError, message, data } = await accessTokenValidator(accessToken, socialType);
    if (hasError) {
      return next(CustomError.createError(message, 200));
    }
    const { name, image, identifier, dateOfBirth, gender } = data;
    const auth = await new AuthModel({
      accessToken,
      socialType,
      identifier,
      userType: "User",
      isVerified: true,
    }).save();
    if (!auth) {
      return next(CustomError.createError("error registering user", 200));
    }
    console.log({ auth });
    const user = await new UserModel({
      auth: auth._id,
      name,
      // image,
      gender: gender ? gender : "",
      dateOfBirth: dateOfBirth ? dateOfBirth : "",
      // location: {
      //   type: "Point",
      //   coordinates: [parseFloat(long), parseFloat(lat)],
      // },
    }).save();
    console.log({ user });
    if (!user) {
      return next(CustomError.createError("error creating profile", 200));
    }
    const createMedia = await new MediaModel({
      mediaType: "image",
      mediaUrl: image,
      userType: "User",
      profile: user._id,
    }).save();
    console.log({ createMedia });
    if (!createMedia) {
      return next(CustomError.createError("error media creating", 200));
    }
    await UserModel.findByIdAndUpdate(user._id, {
      image: createMedia._id,
    });
    await AuthModel.findByIdAndUpdate(auth._id, {
      profile: user._id,
    });
    const device = await new DeviceModel({
      deviceType,
      deviceToken,
      auth: auth._id,
      lastSeen: Date.now(),
      status: "active",
    }).save();
    if (!device) {
      return next(CustomError.createError("error registering with your device", 400));
    }
    // const authToken = await generateToken({
    //   _id: auth._id,
    //   tokenType: "auth",
    //   deviceId: device._id,
    //   isTemporary: false,
    //   userType: auth.userType,
    // });
    // const refreshToken = await generateToken({
    //   _id: auth._id,
    //   tokenType: "refresh",
    //   deviceId: device._id,
    //   isTemporary: false,
    //   userType: auth.userType,
    // });
    const { authToken, refreshToken } = await generateTokenPair({
      payload: {
        uid: user._id,
        ref: user.profile._id.toString(),
        deviceToken,
        ip: forwardedIp ? forwardedIp : ip,
      },
    });
    const profile = { ...user._doc, authToken, refreshToken };
    delete profile.auth;
    delete profile.location;
    return next(CustomSuccess.createSuccess(profile, "user login successfully", 200));
  } catch (error) {
    return next(CustomError.createError(error.message, 200));
  }
};

//login User
// export const Login = async (req, res, next) => {
//   try {
//     const { error } = LoginValidator.validate(req.body);

//     if (error) {
//       error.details.map((err) => {
//         next(CustomError.createError(err.message, 200));
//       });
//     }
//     const { email, password, deviceToken, deviceType } = req.body;
//     let userName, authId;
//     // check if email is valid email via regex
//     const emailRegex = new RegExp(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g);
//     if (!emailRegex.test(email)) {
//       userName = email;
//       const user = await UserModel.findOne(
//         {
//           userName: userName,
//         },
//         {
//           auth: 1,
//         },
//       );
//       if (!user) {
//         return next(CustomError.createError("User not found!", 200));
//       }
//       authId = user.auth;
//     }
//     const query = authId
//       ? {
//           _id: authId.toString(),
//         }
//       : {
//           identifier: await bcrypt.hashSync(email, genSalt),
//         };
//     const user = await AuthModel.findOne(query).populate({
//       path: "profile",
//       populate: {
//         path: "image",
//       },
//     });
//     if (!user) {
//       // return res.status(200).send({ success: false, message: "Email not found!" });
//       return next(CustomError.createError("Email not found!", 200));
//     }
//     const isMatch = await bcrypt.compare(password, user.password);
//     const device = await linkUserDevice(user._id, deviceToken, deviceType);
//     if (!isMatch) {
//       return next(CustomError.createError("You have entered wrong password", 200));
//     }
//     if (!user.isVerified) {
//       return next(CustomError.createError("You account is not verified", 200));
//     }

//     if (device.error) {
//       return next(CustomError.createError(device.error, 200));
//     }
//     const { authToken, refreshToken } = await generateTokenPair({
//       payload: {
//         uid: user._id,
//         ref: user.profile._id.toString(),
//         deviceToken,
//       },
//     });
//     const userProfile = new UserResource(user._doc.profile);
//     return next(
//       CustomSuccess.createSuccess(
//         { ...userProfile.UserObject, authToken, refreshToken },
//         "User login successfully",
//         200,
//       ),
//     );
//   } catch (error) {
//     console.log(error);
//     return next(CustomError.createError(error.message, 200));
//   }
// };

export const Login = async (req, res, next) => {
  console.time("login");
  const { error } = LoginValidator.validate(req.body);
  const { ip, headers } = req;
  const userAgent = headers["user-agent"] || {};
  if (!ip || !userAgent) {
    return next(CustomError.badRequest("ip or user agent not found"));
  }
  if (error) {
    const message = error.details.map((err) => err.message);
    return next(CustomError.badRequest(message.toString()));
  }
  try {
    const { email, password, deviceToken, deviceType } = req.body;
    const workerPool = workerPoolController.get();

    const { ip, headers } = req;
    const forwardedIp = headers["forwarded"]
      ? headers["forwarded"].split(";")[1].replace("for=", "")
      : false;

    const isEmail = new RegExp(
      /^[a-zA-Z0-9._%+-]+(?:\+[0-9]+)?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    ).test(email);

    let query;
    const pipeline = [];
    if (!isEmail) {
      console.time("creating-pipeline");
      pipeline.push(
        {
          $lookup: {
            from: "auths",
            localField: "auth",
            foreignField: "_id",
            as: "auth",
          },
        },
        {
          $unwind: "$auth",
        },
        {
          $lookup: {
            from: "devices",
            let: {
              deviceToken: deviceToken,
            },
            pipeline: [
              {
                $match: {
                  deviceToken: "$deviceToken",
                },
              },
            ],
            as: "auth.device",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "auth.profile",
          },
        },
        {
          $unwind: "$auth.profile",
        },
        {
          $match: {
            "auth.profile.userName": email,
          },
        },
        {
          $lookup: {
            from: "media",
            localField: "auth.profile.image",
            foreignField: "_id",
            as: "auth.profile.image",
          },
        },
        {
          $unwind: {
            path: "$auth.profile.image",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: {
            newRoot: "$auth",
          },
        },
      );
      console.timeEnd("creating-pipeline");
      query = UserModel.aggregate(pipeline);
    } else {
      console.time("creating-pipeline");
      pipeline.push(
        {
          $match: {
            identifier: email,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "auth",
            as: "profile",
          },
        },
        {
          $unwind: "$profile",
        },
        {
          $lookup: {
            from: "media",
            localField: "profile.image",
            foreignField: "_id",
            as: "profile.image",
          },
        },
        {
          $unwind: {
            path: "$profile.image",
            preserveNullAndEmptyArrays: true,
          },
        },
      );
      console.timeEnd("creating-pipeline");
      query = AuthModel.aggregate(pipeline);
    }
    console.timeEnd("creating-query");
    console.time("query");
    const [user] = await query;
    console.timeEnd("query");

    console.time("check-query result");
    if (user === undefined || user === null || user === "" || user.toString() === ("[]" || "{}")) {
      return next(CustomError.createError("Email not found!", 200));
    }

    let verificationStatus = "not-requested"; // Default status
    const verificationRequest = await requestVerificationModel
      .findOne({ userId: user.profile })
      .sort({ createdAt: -1 });
    if (verificationRequest) {
      verificationStatus = verificationRequest.status;
    }

    const isMatch = workerPool
      .offloadPasswordComparisons({
        password,
        hash: user.password,
      })
      .then((result) => {
        console.timeEnd("compare-password");
        if (!result) {
          throw new Error("You have entered wrong password");
        }
      });

    console.time("check-verified-and-match");
    if (!user.isVerified) {
      return next(CustomError.createError("Your account is not verified", 200));
    }
    console.timeEnd("check-verified-and-match");
    console.timeEnd("check-query result");
    console.time("linkUserDevice");
    setImmediate(() => {
      workerPool
        .offloadLinkUserDevice({
          authId: user._id.toString(),
          deviceToken,
          deviceType,
        })
        .then(() => {
          console.timeEnd("linkUserDevice");
        });
    });

    // if (device.error) {
    //   return next(CustomError.createError(device.error, 500));
    // }

    let authToken, refreshToken;
    console.log(deviceToken);
    const tokenPair = generateTokenPair({
      payload: {
        uid: user._id,
        ref: user.profile._id,
        deviceToken,
        ip: forwardedIp ? forwardedIp : ip,
        userAgent,
      },
    });
    /* allow: unused-vars */
    await Promise.all([isMatch, tokenPair]).then((result) => {
      const tokenPair = result[1];
      if (!tokenPair) {
        throw new Error("Error generating token pair");
      }
      authToken = tokenPair.authToken;
      refreshToken = tokenPair.refreshToken;
    });

    const userProfile = new UserResource(user.profile, authToken, refreshToken).UserObject;
    userProfile.verificationStatus = verificationStatus;

    return next(
      CustomSuccess.createSuccess(
        {
          ...userProfile,
          purchasedSubscriptions: user.activeSubscription ? user.activeSubscription : "free",
          subscriptionExpiry: user.subscriptionExpiry ? user.subscriptionExpiry : null,
        },
        "User login successfully",
        200,
      ),
    );
  } catch (error) {
    console.timeEnd("login");
    console.log(error);
    return next(CustomError.createError(error.message, 500));
  }
};

// social login User
export const SocialLogin = async (req, res, next) => {
  try {
    const { error } = SocialLoginValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 200));
      });
    }
    const { socialType, accessToken, deviceToken, deviceType /*lat, long*/ } = req.body;
    const { ip, headers } = req;
    const forwardedIp = headers["forwarded"]
      ? headers["forwarded"].split(";")[1].replace("for=", "")
      : false;

    const { hasError, message, data } = await accessTokenValidator(accessToken, socialType);
    if (hasError) {
      return next(CustomError.createError(message, 200));
    }
    const { name, image, identifier, dateOfBirth, gender } = data;
    const auth = await AuthModel.findOne({
      identifier: identifier,
      userType: "User",
    }).populate("profile");
    // .populate("image");
    if (!auth) {
      return next(CustomError.createError("User not found", 200));
    }
    // update user device
    const device = await linkUserDevice(auth._id, deviceToken, deviceType);
    if (device.error) {
      return next(CustomError.createError(device.error, 200));
    }
    const findMedia = await MediaModel.findOne({ _id: auth.profile.image });
    // delete existing profile picture if exists
    if (findMedia) {
      // const path = auth.profile.image;
      const path = findMedia.mediaUrl;
      // remove old image file from server
      unlink(path, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
    const updateMedia = await new MediaModel({
      mediaType: "image",
      mediaUrl: image,
      userType: "User",
      profile: auth.profile._id,
    }).save();
    // console.log({ createMedia });
    const user = await UserModel.findByIdAndUpdate(
      auth.profile._id,
      {
        $set: {
          name,
          image: updateMedia._id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : auth.profile.dateOfBirth,
          gender: gender ? gender : auth.profile,
          // location: {
          //   type: "point",
          //   coordinates: [parseFloat(long), parseFloat(lat)],
          // },
        },
      },
      {
        new: true,
      },
    );
    // const authToken = await generateToken({
    //   _id: user._id,
    //   tokenType: "auth",
    //   deviceId: device.device._id,
    //   isTemporary: false,
    //   userType: user.userType,
    // });
    // const refreshToken = await generateToken({
    //   _id: user._id,
    //   tokenType: "refresh",
    //   deviceId: device.device._id,
    //   isTemporary: false,
    //   userType: user.userType,
    // });
    const { authToken, refreshToken } = await generateTokenPair({
      payload: {
        uid: user._id,
        ref: user.profile._id.toString(),
        ip: forwardedIp ? forwardedIp : ip,
        deviceToken,
      },
    });
    const profile = { ...user._doc, authToken, refreshToken };
    delete profile.auth;
    delete profile.location;
    return next(CustomSuccess.createSuccess(profile, "User login successfully", 200));
  } catch (error) {
    if (error.message === "You have entered wrong password") {
      return next(CustomError.createError(error.message, 401));
    }

    console.log(error);
    return next(CustomError.createError(error.message, 200));
  }
};

//forget password User
export const ForgetPassword = async (req, res, next) => {
  try {
    // VAlidate the request body
    const { error } = ForgotPasswordValidator.validate(req.body);
    if (error) {
      next(CustomError.createError(error.message, 200));
    }
    // var UserDetail;
    const identifier = req.body.email;
    // var UserDetail;
    const userDetail = await AuthModel.findOne({ identifier }).populate("profile");
    if (!userDetail) {
      return next(CustomError.createError("User not found", 200));
    }
    const name = userDetail.profile.fullName
      ? userDetail.profile.fullName
      : userDetail.profile.userName;
    // Generate 6 Digit OTP
    const OTP = randomInt(100000, 999999);

    const emailData = emailForResetPassword({ name, otp: OTP });
    // store OTP in DB
    const otpDb = await OtpModel.create({
      auth: userDetail._id,
      createdAt: new Date(),
      otpKey: OTP,
      reason: "forgotPassword",
      expireAt: new Date(new Date().getTime() + 60 * 60 * 1000),
    });
    // set otpDb._id in userDetail
    userDetail.OTP = otpDb._id;
    await userDetail.save();
    sendEmails(req.body.email, emailData.subject, emailData.html, emailData.attachments);

    // Send Response
    return next(
      CustomSuccess.createSuccess(OTP, "OTP has been sent to the registered account", 200),
    );
  } catch (error) {
    if (error.code === 11000) {
      return next(CustomError.createError("code not send", 200));
    }
    return next(CustomError.createError(error.message, 200));
  }
};

export const ResendOtp = async (req, res, next) => {
  try {
    // Validate the request body
    const { error } = ResendOTPValidator.validate(req.body);
    if (error) {
      next(CustomError.createError(error.message, 200));
    }
    const { email, reason } = req.body;
    // var UserDetail;
    const identifier = email;
    // var UserDetail;
    const userDetail = await AuthModel.findOne({
      identifier,
    }).populate(["profile", "OTP"]);
    if (!userDetail) {
      return next(CustomError.createError("User not found", 200));
    }
    // if (userDetail.isVerified) {
    //   return next(CustomError.createError("Your account is already verified", 200));
    // }
    const name =
      userDetail.profile && userDetail.profile.fullName
        ? " " + userDetail.profile.fullName + ","
        : ",";
    // Generate 6 Digit OTP
    const OTP = randomInt(100000, 999999);
    const _uid = uid(16);

    const emailData = emailForResetPassword({ name, otp: OTP });
    console.log(emailData, "*************************************");
    const userOTP = bcrypt.hashSync(OTP.toString(), genSalt);
    if (emailData.error) {
      return next(CustomError.createError(emailData.message, 200));
    }
    // update OTP
    const otpDB = await OtpModel.findOneAndUpdate(
      {
        auth: userDetail._id,
      },
      {
        $setOnInsert: {
          auth: userDetail._id,
          // comment code
          reason: "verification",
          otpKey: userOTP,
          expireAt: new Date(new Date().getTime() + 60 * 60 * 1000),
        },
        $set: {
          uid: hashSync(_uid, genSalt),
          otpKey: userOTP,
          expireAt: new Date(new Date().getTime() + 60 * 60 * 1000),
          reason,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
    await AuthModel.updateOne(
      {
        identifier,
      },
      {
        $set: {
          OTP: otpDB._id,
        },
      },
    );
    // sendEmails(email, emailData.subject, emailData.html, emailData.attachments);
    sendEmails(req.body.email, emailData.subject, emailData.html, emailData.attachments);
    return next(
      CustomSuccess.createSuccess({}, "OTP has been sent to the registered account", 200),
    );
  } catch (error) {
    console.log(error);
    return next(CustomError.createError(error.message, 200));
  }
};
export const verifyLink = async (req, res, next) => {
  const { uid, otp } = req.query;
  if (!uid || !otp) {
    return next(CustomError.createError("Invalid Link", 200));
  }
  const _uid = await bcrypt.hash(uid, genSalt);
  const otpKey = await bcrypt.hash(otp, genSalt);
  const otpDb = await OtpModel.findOneAndUpdate(
    {
      uid: _uid,
      otpKey,
      otpUsed: false,
    },
    {
      $set: {
        otpUsed: true,
      },
    },
    {
      new: true,
    },
  );
  if (!otpDb) {
    res.writeHead(302, {
      Location: "https://thescribbleapp.com/success/",
    });
    res.end();
    return next();
    // return next(CustomError.createError("Cannot find entry within database", 404));
  }
  await AuthModel.findOneAndUpdate(
    {
      _id: otpDb.auth,
    },
    {
      $set: {
        isVerified: true,
        OTP: null,
      },
    },
  );
  res.writeHead(302, {
    // Location: "https://thescribbleapp.com/thank-you/",
    Location: process.env.FIREBASE_APP_KEY,
  });
  console.log(process.env.FIREBASE_APP_KEY, "process.env.FIREBASE_APP_KEY");
  res.end();
  return next();
};
export const CheckUserName = async (req, res, next) => {
  const { error } = UserNameValidator.validate(req.body);
  if (error) {
    const errList = error.details.map((err) => err.message);
    return next(CustomError.createError(errList.toString(), 200));
  }
  const { username } = req.body;
  try {
    UserModel.findOne({
      userName: username,
    })
      .exec()
      .then(
        (data) => {
          if (data) {
            return next(CustomError.createError("Username is already taken", 200));
          } else {
            return next(CustomSuccess.createSuccess({}, "Username is available", 200));
          }
        },
        (err) => {
          return next(CustomError.createError(err.message, 200));
        },
      );
  } catch (err) {
    return next(CustomError.createError(err.message, 200));
  }
};
//verify otp User
export const VerifyOtp = async (req, res, next) => {
  try {
    const { error } = verifyOTPValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 200));
      });
    }
    const { ip, headers } = req;
    const forwardedIp = headers["forwarded"]
      ? headers["forwarded"].split(";")[1].replace("for=", "")
      : false;
    const userAgent = headers["user-agent"] || {};
    const { email, otp, deviceToken, deviceType } = req.body;
    const identifier = email;
    const user = await AuthModel.findOne({ identifier }).populate(["profile", "OTP"]);
    if (!user) {
      return next(CustomError.createError("User not found", 200));
    }
    const OTP = user.OTP;
    if (!OTP) {
      return next(CustomError.createError("OTP not found", 200));
    } else if (OTP.otpUsed) {
      return next(CustomError.createError("OTP already used", 200));
    }
    const userOTP = bcrypt.hashSync(otp, genSalt);
    if (OTP.otpKey !== userOTP) {
      return next(CustomError.createError("Invalid OTP", 200));
    }
    const currentTime = new Date();
    const OTPTime = OTP.createdAt;
    const diff = currentTime.getTime() - OTPTime.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes > 60) {
      return next(CustomError.createError("OTP expired", 200));
    }
    const device = await linkUserDevice(user._id, deviceToken, deviceType);
    if (device.error) {
      return next(CustomError.createError(device.error, 200));
    }
    // const authToken = await generateToken({
    //   _id: user._id,
    //   tokenType: "auth",
    //   deviceId: device.device._id,
    //   isTemporary: OTP._doc.reason === "forgotPassword" ? true : false,
    //   userType: user.userType,
    // });
    // const refreshToken = await generateToken({
    //   _id: user._id,
    //   tokenType: "refresh",
    //   deviceId: device.device._id,
    //   isTemporary: OTP._doc.reason === "forgotPassword" ? true : false,
    //   userType: user.userType,
    // });
    const { authToken, refreshToken } = await generateTokenPair({
      payload: {
        uid: user._id,
        ref: user.profile._id.toString(),
        deviceToken,
        ip: forwardedIp ? forwardedIp : ip,
        userAgent,
      },
      z,
    });

    const bulkOps = [];
    const update = { otpUsed: true };
    const userUpdate = { isVerified: true };
    if (OTP._doc.reason !== "forgotPassword") {
      bulkOps.push({
        deleteOne: {
          filter: { _id: OTP._id },
        },
      });
      userUpdate.OTP = null;
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: OTP._id },
        update: { $set: update },
      },
    });
    await OtpModel.bulkWrite(bulkOps);
    await AuthModel.updateOne({ identifier: user.identifier }, { $set: userUpdate });
    const userProfile = new UserResource(user.profile);
    const profile = { ...userProfile.UserObject, authToken, refreshToken };
    if (OTP._doc.reason === "forgotPassword") {
      profile.otpId = OTP._id;
    }

    delete profile.auth;
    delete profile.location;

    return next(CustomSuccess.createSuccess(profile, "OTP verified successfully", 200));
  } catch (error) {
    if (error.code === 11000) {
      return next(CustomError.createError("otp not verify", 200));
    }
    return next(CustomError.createError(error.message, 200));
  }
};

//reset password User
export const ResetPassword = async (req, res, next) => {
  try {
    const { error } = ResetPasswordValidator.validate(req.body);

    if (error) {
      const message = error.details.map((err) => {
        return err.message;
      });
      return next(CustomError.createError(message, 400));
    }
    const { password, otpId } = req.body;
    console.log(req.body, "req.body");
    const findOtp = await OtpModel.findOne({ _id: otpId });

    if (!findOtp) {
      return next(CustomError.createError("OTP is not correct", 200));
    }

    const authId = req.authId;
    const updateUser = await AuthModel.findOneAndUpdate(
      {
        _id: authId,
        OTP: {
          $ne: null,
        },
      },
      {
        password: bcrypt.hashSync(password, genSalt),
        OTP: null,
      },
      { new: true },
    ).populate("profile");
    //
    await OtpModel.deleteOne({
      _id: otpId,
    });
    if (!updateUser) {
      return next(CustomError.createError("password not reset", 200));
    }

    return next(CustomSuccess.createSuccess({}, "password reset successfully", 200));
  } catch (error) {
    if (error.code === 11000) {
      return next(CustomError.createError("code not send", 200));
    }
    return next(CustomError.createError(error.message, 200));
  }
};

// export const UpdateProfile = async (req, res, next) => {
//   console.time("UpdateProfile");
//   const workerPool = workerPoolController.get();
//   try {
//     const { error } = UpdateProfileValidator.validate(req.body);
//     // return next(CustomError.createError(req.authId, 200));
//     if (error) {
//       const message = error.details.map((err) => err.message).toString();
//       throw new Error(message);
//     }
//     const pipeline = [
//       {
//         $match: {
//           $or: [{ userName: req.body.userName }, { _id: mongoose.Types.ObjectId(req.profileId) }],
//         },
//       },
//       {
//         $lookup: {
//           from: "media",
//           localField: "image",
//           foreignField: "_id",
//           as: "image",
//         },
//       },
//       {
//         $unwind: {
//           path: "$image",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//     ];
//     const user = await UserModel.aggregate(pipeline);
//     if (!user) {
//       throw new Error("User not found");
//     }
//     if (user.length > 1) {
//       throw new Error("User name already exist");
//     }
//     if (user[0]._id.toString() !== req.profileId.toString()) {
//       throw new Error("User name already exist");
//     }
//     const userProfile = user[0];
//     const image = req.files && req.files.image && req.files.image[0] ? req.files.image[0] : null;

//     const imageUrl = req.headers["fileName"]
//       ? "public/uploads/" + req.headers["fileName"]
//       : image
//       ? image.path
//       : null;
//     const profileData = { ...req.body };

//     delete profileData.email;

//     const offloadPayload = {
//       profileId: req.profileId,
//       updateObj: profileData,
//     };

//     if (imageUrl) {
//       offloadPayload.mediaUrl = imageUrl;
//       offloadPayload.mediaId = userProfile.image._id ? userProfile.image._id.toString() : null;

//       userProfile.image = {
//         _id: userProfile.image._id ? userProfile.image._id.toString() : null,
//         mediaUrl: imageUrl,
//       };
//     }
//     const profile = Object.keys(userProfile).reduce((acc, key) => {
//       if (profileData[key]) {
//         acc[key] = profileData[key];
//       } else {
//         acc[key] = userProfile[key];
//       }
//       return acc;
//     }, {});
//     // if (!media) {
//     //   queries.push(new Promise((resolve) => resolve(true)));
//     // }

//     // const profile = UserModel.findOneAndUpdate({ _id: req.profileId }, profileData, {
//     //   new: true,
//     //   session,
//     //   lean: true,
//     // }).populate(["image"]);
//     // queries.push(profile);
//     setImmediate(async () => {
//       workerPool.offloadUpdateProfile(offloadPayload);
//     });

//     const userResource = new UserResource(profile);

//     console.timeEnd("UpdateProfile");
//     return next(
//       CustomSuccess.createSuccess(userResource.UserObject, "profile updated successfully", 200),
//     );
//   } catch (error) {
//     console.timeEnd("UpdateProfile");
//     if (error.keyValue && error.keyValue.userName) {
//       return next(CustomError.createError("Username is already taken.", 200));
//     }
//     return next(CustomError.createError(error.message, 400));
//   }
// };
// function bufferToReadableStream(arrayBuffer) {
//   const buffer = Buffer.from(arrayBuffer);
//   const readableStream = new Readable({
//     read() {
//       this.push(buffer);
//       this.push(null);
//     },
//   });

//   return readableStream;
// }
// async function parseMultipartFormData(readableStream, contentType) {
//   return new Promise(async (resolve, reject) => {
//     const boundary = contentType.split("boundary=")[1];
//     const boundaryBuffer = Buffer.from(`\r\n--${boundary}`);
//     const chunks = [];

//     for await (const chunk of readableStream) {
//       chunks.push(chunk);
//     }

//     const buffer = Buffer.concat(chunks);
//     const parts = [];

//     let position = 0;

//     while (position < buffer.length) {
//       const boundaryIndex = buffer.indexOf(boundaryBuffer, position);

//       if (boundaryIndex < 0) break;

//       const part = buffer.slice(position, boundaryIndex);
//       position = boundaryIndex + boundaryBuffer.length;

//       if (part.length > 0) {
//         parts.push(part.slice(2, part.length - 2));
//       }
//     }

//     const parsedData = {};

//     parts.forEach((part) => {
//       const [headerPart, dataPart] = part.toString().split("\r\n\r\n", 2);
//       const headers = headerPart.split("\r\n");
//       const contentDisposition = headers.find((header) =>
//         header.startsWith("Content-Disposition:"),
//       );
//       const contentTypeHeader = headers.find((header) => header.startsWith("Content-Type:"));

//       const fieldName = contentDisposition.match(/name="([^"]+)"/)?.[1];
//       const fileName = contentDisposition.match(/filename="([^"]+)"/)?.[1];

//       if (fieldName) {
//         const dataIndex = part.indexOf("\r\n\r\n", headerPart.length) + 4;
//         const data = part.slice(dataIndex, part.length - 2);

//         if (fileName) {
//           // File data
//           parsedData[fieldName] = {
//             fileName,
//             contentType: contentTypeHeader?.split(":")[1]?.trim(),
//             data,
//           };
//         } else {
//           // Text field data
//           parsedData[fieldName] = data.toString();
//         }
//       }
//     });

//     resolve(parsedData);
//   });
// }

export const UpdateProfile = async (req, res, next) => {
  try {
    const { error } = UpdateProfileValidator.validate(req.body);
    // return next(CustomError.createError(req.authId, 200));
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 400));
      });
    }
    const serviceUrl = process.env.SERVICE_URL;
    if (!serviceUrl) {
      return next(CustomError.createError("service url not found", 500));
    }
    // return next(CustomError.createError(req.body, 200));

    const image = req.files && req.files.image && req.files.image[0] ? req.files.image[0] : null;
    const isUserExist = await UserModel.findOne({ _id: req.profileId });
    if (!isUserExist) {
      return next(CustomError.createError("user not exist", 200));
    }

    // file, mediaType, userType, profile

    let imageUrl;
    if (image) {
      const headers = {
        "Content-Type": "multipart/form-data",
        "Content-Disposition": `attachment;name="image" ;filename="${image.filename}"`,
      };
      axios.interceptors.request.use(axiosFormData);
      await axios
        .request({
          method: "POST",
          url: serviceUrl,
          headers,
          data: {
            image: createReadStream(image.path),
            text: "some text",
          },
        })
        .then((res) => {
          console.log(res);
        })
        .catch((error) => {
          console.log("error in file upload => ", error);
          return next(CustomError.createError(error.message, 500));
        });
      imageUrl = await uploadMedia(image, "image", "User", req.profileId);
    }
    const profileData = { ...req.body };
    delete req.body.email;
    if (imageUrl) {
      profileData.image = imageUrl;
    }
    const profile = await UserModel.findOneAndUpdate({ _id: req.profileId }, profileData, {
      new: true,
    }).populate(["image"]);
    if (!profile) {
      return next(CustomError.createError("profile not found therefore not updated", 404));
    }

    const userProfile = new UserResource(profile);

    return next(
      CustomSuccess.createSuccess(userProfile.UserObject, "profile updated successfully", 200),
    );
  } catch (error) {
    if (error.keyValue && error.keyValue.userName) {
      return next(CustomError.createError("Username is already taken.", 200));
    }
    return next(CustomError.createError(error.message, 400));
  }
};
export const Logout = async (req, res, next) => {
  const { authId } = req;
  const deviceToken = req.body.deviceToken;
  const devicePipeline = [
    {
      $match: {
        auth: authId,
        deviceToken: deviceToken,
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
    {
      limit: 1,
    },
  ];
  try {
    const checkDevices = await DeviceModel.aggregate(devicePipeline);
    if (!checkDevices.length) {
      return next(CustomError.badRequest("Device not found"));
    }
    const [checkedDevice] = checkDevices;

    const device = DeviceModel.updateOne(
      {
        auth: authId,
        deviceToken: deviceToken,
      },
      {
        $set: {
          status: "loggedOut",
        },
      },
    );
    const auth = AuthModel.updateOne(
      {
        _id: authId,
      },
      {
        $pull: {
          devices: checkedDevice._id,
        },
        $addToSet: {
          loggedOutDevices: checkedDevice._id,
        },
      },
    );
    return Promise.all([device, auth]).then(() => {
      return next(CustomSuccess.createSuccess({}, "Logged out successfully", 200));
    });
  } catch (e) {
    console.log(e);
    return next(CustomError.internal("Something went wrong"));
  }
};
export const deleteAccount = async (req, res, next) => {
  const { authId, profileId } = req;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const auth = AuthModel.deleteOne(
      {
        _id: authId,
      },
      {
        session,
      },
    );
    const profile = UserModel.deleteOne(
      {
        _id: profileId,
      },
      {
        session,
      },
    );
    const posts = PostModel.deleteMany({
      user: profileId,
    }).session(session);
    const reactions = ReactionModel.deleteMany({
      user: profileId,
    }).session(session);
    const comments = CommentModel.deleteMany({
      user: profileId,
    }).session(session);
    return await Promise.all([auth, profile, posts, reactions, comments]).then(() => {
      session.commitTransaction();
      return next(CustomSuccess.createSuccess({}, "Account deleted successfully", 200));
    });
  } catch (e) {
    session.abortTransaction();
    console.log(e);
    return next(CustomError.internal("Something went wrong"));
  }
};
export const asyncFileStorage = async (req, res, next) => {
  const extName = req.headers.extname;
  if (!extName) {
    return next(CustomError.badRequest("Please send extension name in header."));
  }
  const acceptedTypes = /jpeg|jpg|png|gif/;
  const isValidExtension = acceptedTypes.test(extName);
  if (!isValidExtension) {
    return next(CustomError.badRequest("Please send a valid extension suffix"));
  }
  req.headers["fileName"] = uid(16) + "." + extName;
  console.log(req.headers["fileName"]);
  uploadSingleImage.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ])(req, res, () => {
    console.log("running");
  });
  return next();
};
export const requestProfileVerification = async (req, res, next) => {
  const { profileId } = req;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const verficationRequest = new VerificationRequestModel({
      user: profileId,
      isApproved: false,
    });
    return verficationRequest.save({ session }).then(() => {
      session.commitTransaction();
      return next(CustomSuccess.createSuccess({}, "Verification request sent successfully", 200));
    });
  } catch (e) {
    session.abortTransaction();
    console.log(e);
    return next(CustomError.internal("Something went wrong"));
  }
};

export const verifyAuthToken = async (req, res, next) => {
  try {
    const { authId } = req;

    if (!authId) return next(CustomError.unauthorized("Unauthorized"));
    const auth = await AuthModel.findOne({ _id: authId });
    if (!auth) return next(CustomError.unauthorized("Unauthorized"));
    return next(CustomSuccess.createSuccess({}, "Authorized", 200));
  } catch (err) {
    console.log(err, "INSIDE CONTROLLER");
    return next(CustomError.internal(err.message));
  }
};
