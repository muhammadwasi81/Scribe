import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { generateToken } from "../Utils/jwt.js";
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
import { uploadMedia } from "../Utils/Resource/imageResource.js";
import { uid } from "uid/secure";
import { UserResource } from "../Utils/Resource/UserResource.js";
import axios from "axios";
// import { date } from "joi";
// import ForgetPassword from '../DB/Models/ForgetPassword.js'
config();

export const Register = async (req, res, next) => {
  try {
    const { error } = RegisterValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        return next(CustomError.createError(err.message, 200));
      });
    }
    const {
      userName,
      fullName,
      description,
      email,
      password,
      deviceType,
      deviceToken /*lat, long*/,
    } = req.body;
    const auth = new AuthModel({
      identifier: email,
      password,
      userType: "User",
      //   type: "Point",
      // },
    });
    if (!auth) {
      return next(CustomError.createError("error registering user", 200));
    }
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

export const SocialRegister = async (req, res, next) => {
  try {
    const { error } = SocialRegisterValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        return next(CustomError.createError(err.message, 200));
      });
    }

    const { socialType, accessToken, deviceType, deviceToken /*lat, long*/ } = req.body;
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
      gender: gender ? gender : "",
      dateOfBirth: dateOfBirth ? dateOfBirth : "",
      //   type: "Point",
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
    const authToken = await generateToken({
      _id: auth._id,
      tokenType: "auth",
      deviceId: device._id,
      isTemporary: false,
      userType: auth.userType,
    });
    const refreshToken = await generateToken({
      _id: auth._id,
      tokenType: "refresh",
      deviceId: device._id,
      isTemporary: false,
      userType: auth.userType,
    });
    const profile = { ...user._doc, authToken, refreshToken };
    delete profile.auth;
    delete profile.location;
    return next(CustomSuccess.createSuccess(profile, "user login successfully", 200));
  } catch (error) {
    return next(CustomError.createError(error.message, 200));
  }
};
export const Login = async (req, res, next) => {
  try {
    const { error } = LoginValidator.validate(req.body);

    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 200));
      });
    }
    const { email, password, deviceToken, deviceType } = req.body;
    let userName, authId;
    const emailRegex = new RegExp(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g);
    if (!emailRegex.test(email)) {
      userName = email;
      const user = await UserModel.findOne(
        {
          userName: userName,
        },
        {
          auth: 1,
        },
      );
      if (!user) {
        return next(CustomError.createError("User not found!", 200));
      }
      authId = user.auth;
    }
    const query = authId
      ? {
          _id: authId.toString(),
        }
      : {
          identifier: await bcrypt.hashSync(email, genSalt),
        };
    const user = await AuthModel.findOne(query).populate({
      path: "profile",
      populate: {
        path: "image",
      },
    });
    if (!user) {
      return next(CustomError.createError("Email not found!", 200));
    }
    const isMatch = await bcrypt.compare(password, user.password);
    const device = await linkUserDevice(user._id, deviceToken, deviceType);
    if (!isMatch) {
      return next(CustomError.createError("You have entered wrong password", 200));
    }
    if (!user.isVerified) {
      return next(CustomError.createError("You account is not verified", 200));
    }
    //   return next(CustomError.createError("You have not verified your email", 200));

    if (device.error) {
      return next(CustomError.createError(device.error, 200));
    }
    //   user._doc.profile._id,
    //     $set: {
    //         type: "point",
    //       },
    //   },
    //     new: true,
    // );
    const authToken = await generateToken({
      _id: user._id,
      tokenType: "auth",
      deviceId: device.device._id,
      isTemporary: false,
      userType: user.userType,
    });
    const refreshToken = await generateToken({
      _id: user._id,
      tokenType: "refresh",
      deviceId: device.device._id,
      isTemporary: false,
      userType: user.userType,
    });
    const userProfile = new UserResource(user._doc.profile);
    return next(
      CustomSuccess.createSuccess(
        { ...userProfile.UserObject, authToken, refreshToken },
        "User login successfully",
        200,
      ),
    );
  } catch (error) {
    console.log(error);
    return next(CustomError.createError(error.message, 200));
  }
};
export const SocialLogin = async (req, res, next) => {
  try {
    const { error } = SocialLoginValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 200));
      });
    }
    const { socialType, accessToken, deviceToken, deviceType /*lat, long*/ } = req.body;
    const { hasError, message, data } = await accessTokenValidator(accessToken, socialType);
    if (hasError) {
      return next(CustomError.createError(message, 200));
    }
    const { name, image, identifier, dateOfBirth, gender } = data;
    const auth = await AuthModel.findOne({
      identifier: await bcrypt.hash(identifier, genSalt),
      userType: "User",
    }).populate("profile");
    if (!auth) {
      return next(CustomError.createError("User not found", 200));
    }
    const device = await linkUserDevice(auth._id, deviceToken, deviceType);
    if (device.error) {
      return next(CustomError.createError(device.error, 200));
    }
    const findMedia = await MediaModel.findOne({ _id: auth.profile.image });
    if (findMedia) {
      const path = findMedia.mediaUrl;
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
    const user = await UserModel.findByIdAndUpdate(
      auth.profile._id,
      {
        $set: {
          name,
          image: updateMedia._id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : auth.profile.dateOfBirth,
          gender: gender ? gender : auth.profile,
          //   type: "point",
          // },
        },
      },
      {
        new: true,
      },
    );
    const authToken = await generateToken({
      _id: user._id,
      tokenType: "auth",
      deviceId: device.device._id,
      isTemporary: false,
      userType: user.userType,
    });
    const refreshToken = await generateToken({
      _id: user._id,
      tokenType: "refresh",
      deviceId: device.device._id,
      isTemporary: false,
      userType: user.userType,
    });
    const profile = { ...user._doc, authToken, refreshToken };
    delete profile.auth;
    delete profile.location;
    return next(CustomSuccess.createSuccess(profile, "User login successfully", 200));
  } catch (error) {
    console.log(error);
    return next(CustomError.createError(error.message, 200));
  }
};
export const ForgetPassword = async (req, res, next) => {
  try {
    const { error } = ForgotPasswordValidator.validate(req.body);
    if (error) {
      next(CustomError.createError(error.message, 200));
    }
    const identifier = bcrypt.hashSync(req.body.email, genSalt);
    const userDetail = await AuthModel.findOne({ identifier }).populate("profile");
    if (!userDetail) {
      return next(CustomError.createError("User not found", 200));
    }
    const name = userDetail.profile.fullName
      ? userDetail.profile.fullName
      : userDetail.profile.userName;
    const OTP = randomInt(100000, 999999);

    const emailData = emailForResetPassword({ name, otp: OTP });
    const otpDb = await OtpModel.create({
      auth: userDetail._id,
      createdAt: new Date(),
      otpKey: OTP,
      reason: "forgotPassword",
      expireAt: new Date(new Date().getTime() + 60 * 60 * 1000),
    });
    userDetail.OTP = otpDb._id;
    await userDetail.save();
    sendEmails(req.body.email, emailData.subject, emailData.html, emailData.attachments);
    return next(
      CustomSuccess.createSuccess(OTP, "Email has been sent to the registered account", 200),
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
    const { error } = ResendOTPValidator.validate(req.body);
    if (error) {
      next(CustomError.createError(error.message, 200));
    }
    const { email, reason } = req.body;
    const identifier = await bcrypt.hash(email, genSalt);
    const userDetail = await AuthModel.findOne({
      identifier,
    }).populate(["profile", "OTP"]);
    if (!userDetail) {
      return next(CustomError.createError("User not found", 200));
    }
    if (userDetail.isVerified) {
      return next(CustomError.createError("Your account is already verified", 200));
    }
    const name =
      userDetail.profile && userDetail.profile.fullName
        ? " " + userDetail.profile.fullName + ","
        : ",";
    const OTP = randomInt(100000, 999999);
    const _uid = uid(16);

    const emailData = emailForAccountVerification({ otp: OTP, name, uid: _uid });

    const userOTP = bcrypt.hashSync(OTP.toString(), genSalt);
    if (emailData.error) {
      return next(CustomError.createError(emailData.message, 200));
    }
    const otpDB = await OtpModel.findOneAndUpdate(
      {
        auth: userDetail._id,
      },
      {
        $setOnInsert: {
          auth: userDetail._id,
          // otpKey: userOTP,
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
    sendEmails(email, emailData.subject, emailData.html, emailData.attachments);
    return next(
      CustomSuccess.createSuccess({}, "Email has been sent for the verification account", 200),
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
    return next(CustomError.createError("Cannot find entry within database", 200));
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
  return next(CustomSuccess.createSuccess({}, "Account verified successfully", 200));
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
export const VerifyOtp = async (req, res, next) => {
  try {
    const { error } = verifyOTPValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 200));
      });
    }
    const { email, otp, deviceToken, deviceType } = req.body;
    const identifier = bcrypt.hashSync(email, genSalt);
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
    const authToken = await generateToken({
      _id: user._id,
      tokenType: "auth",
      deviceId: device.device._id,
      isTemporary: OTP._doc.reason === "forgotPassword" ? true : false,
      userType: user.userType,
    });
    const refreshToken = await generateToken({
      _id: user._id,
      tokenType: "refresh",
      deviceId: device.device._id,
      isTemporary: OTP._doc.reason === "forgotPassword" ? true : false,
      userType: user.userType,
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

export const UpdateProfile = async (req, res, next) => {
  try {
    const { error } = UpdateProfileValidator.validate(req.body);
    if (error) {
      error.details.map((err) => {
        next(CustomError.createError(err.message, 400));
      });
    }
    const serviceUrl = process.env.SERVICE_URL;
    if (!serviceUrl) {
      return next(CustomError.createError("service url not found", 500));
    }

    const image = req.files && req.files.image && req.files.image[0] ? req.files.image[0] : null;
    const isUserExist = await UserModel.findOne({ _id: req.profileId });
    if (!isUserExist) {
      return next(CustomError.createError("user not exist", 200));
    }

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
