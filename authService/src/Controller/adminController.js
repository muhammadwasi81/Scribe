import { hash } from "bcrypt";
import mongoose from "mongoose";
import { AdminModel } from "../DB/Model/adminModel.js";
import AuthModel from "../DB/Model/authModel.js";
import { generateTokenPair } from "../Utils/jwt.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { genSalt } from "../Utils/saltGen.js";

export const Register = async (req, res, next) => {
  const { email, password } = req.body;
  const { ip, headers } = req;
  const userAgent = headers["user-agent"];
  if (!email || !password || !ip || !userAgent) {
    return next(CustomError.badRequest("Email and password are required"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  const auth = new AuthModel({
    identifier: email,
    password,
    isVerified: true,
    userType: "Admin",
  });
  const admin = new AdminModel({
    auth: auth._id,
    fullName: "Admin",
  });
  auth.profile = admin._id;
  const { authToken, refreshToken } = await generateTokenPair({
    payload: {
      uid: auth._id.toString(),
      ref: admin._id.toString(),
      deviceToken: "1234567890",
      ip,
      userAgent,
    },
  });
  return Promise.all([auth.save(), admin.save()])
    .then(async () => {
      await session.commitTransaction();
      session.endSession();
      return next(CustomSuccess.created({ authToken, refreshToken }, "Registration successful"));
    })
    .catch(async (err) => {
      await session.abortTransaction();
      session.endSession();
      return next(CustomError.internal(err.message));
    });
};
export const Login = async (req, res, next) => {
  const { email, password } = req.body;
  const { ip, headers } = req;
  const userAgent = headers["user-agent"];
  const encryptedPassword = await hash(password, genSalt);
  console.log(encryptedPassword);
  const pipeline = [
    {
      $match: {
        identifier: email,
        password: encryptedPassword,
      },
    },
    {
      $lookup: {
        from: "admins",
        localField: "_id",
        foreignField: "auth",
        as: "profile",
      },
    },
    {
      $unwind: "$profile",
    },
    // {
    //   $lookup: {
    //     from: "media",
    //     localField: "profile.image",
    //     foreignField: "_id",
    //     as: "profile.image",
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$profile.image",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
  ];
  const authArray = await AuthModel.aggregate(pipeline);
  if (!authArray.length) {
    console.log(authArray);
    return next(CustomError.unauthorized("Invalid email or password"));
  }
  if (!authArray[0] && !authArray[0].isVerified) {
    return next(CustomError.unauthorized("Account not verified"));
  }
  const auth = authArray[0];

  const { authToken, refreshToken } = await generateTokenPair({
    payload: {
      uid: auth._id.toString(),
      ref: auth.profile._id.toString(),
      deviceToken: "1234567890",
      ip,
      userAgent,
      userType: "Admin",
    },
  });
  return next(CustomSuccess.createSuccess("Login successful", { authToken, refreshToken }, 200));
};

