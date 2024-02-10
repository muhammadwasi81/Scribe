import keyGen from "./keyGen.js";
import * as jose from "jose";
import dotenv from "dotenv";
// import AuthModel from "../DB/Model/authModel.js";
// import DeviceModel from "../DB/Model/deviceModel.js";
// import UserModel from "../DB/Model/userModel.js";
// import mongoose from "mongoose";
// import DeviceModel from "../DB/Model/deviceModel.js";

const envConfig = dotenv.config({ path: "./.env" }).parsed;

const endpoint = envConfig ? envConfig["ENDPOINT"] : "localhost";
const { publicKey, privateKey } = keyGen;

export const tokenGen = async (user, tokenType, deviceToken) => {
  return await new jose.EncryptJWT({
    uid: user._id,
    ref: tokenType === tokenType.refresh ? user.publicId : "",
    deviceToken: deviceToken ? deviceToken : "",
    userType: user.userType,
    tokenType: tokenType ? tokenType : tokenType.auth,
  })
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .setIssuedAt(new Date().getTime())
    .setIssuer(endpoint)
    .setAudience(endpoint)
    .setExpirationTime(tokenType === "refresh" ? "30d" : "2d")
    .encrypt(publicKey);
};
export const generateUserToken = async ({
  _id,
  profileId = "",
  userType = "User",
  tokenType = "auth",
  authTokenReference = "",
  deviceToken = "",
  ip = "",
  userAgent = "",
}) => {
  return await new jose.EncryptJWT({
    uid: _id,
    ref: profileId,
    deviceToken,
    authTokenReference,
    userType,
    tokenType,
    ip,
    userAgent,
  })
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .setIssuedAt(new Date().getTime())
    .setIssuer(endpoint)
    .setAudience(endpoint)
    .setExpirationTime(tokenType === "refresh" ? "30d" : "2d")
    .encrypt(publicKey);
};

export const joseJwtDecrypt = async (token, PK = privateKey) => {
  try {
    const decryptedToken = await jose.jwtDecrypt(token, PK);
    return decryptedToken;
  } catch (error) {
    
  
    return { error };
  }
};
// const getUserProfile = async (uid, deviceToken) => {
//   const user = await AuthModel.findById(uid)
//     .populate({
//       path: "profile",
//       model: UserModel,
//     })
//     .populate({
//       path: "devices",
//       model: DeviceModel,
//       match: { deviceToken },
//     })
//     .lean();
//   if (!user) {
//     throw new Error("User not found");
//   }
//   const profile = user.profile;
//   // delete profile.auth;
//   return {
//     data: profile,
//     devices: user.devices,
//     message: "User found",
//     status: 200,
//   };
// };

// const getUserProfile = async (uid, deviceToken, deviceId) => {
//   // const pipeline = [
//   //   {
//   //     $match: {
//   //       _id: mongoose.Types.ObjectId(uid),
//   //     },
//   //   },
//   //   {
//   //     $lookup: {
//   //       from: "users",
//   //       localField: "profile",
//   //       foreignField: "_id",
//   //       as: "profile",
//   //     },
//   //   },
//   //   {
//   //     $unwind: "$profile",
//   //   },
//   //   {
//   //     $lookup: {
//   //       from: "devices",
//   //       let: { deviceId: mongoose.Types.ObjectId(deviceId), deviceToken },
//   //       pipeline: [
//   //         {
//   //           $match: {
//   //             $expr: {
//   //               $and: [{ $eq: ["$_id", "$$deviceId"] }, { $eq: ["$deviceToken", "$$deviceToken"] }],
//   //             },
//   //           },
//   //         },

//   //         {
//   //           $project: {
//   //             _id: 1,
//   //             deviceToken: 1,
//   //           },
//   //         },
//   //         {
//   //           $limit: 1,
//   //         },
//   //       ],
//   //       as: "devices",
//   //     },
//   //   },
//   //   {
//   //     $project: {
//   //       profile: {
//   //         _id: 1,
//   //         auth: 1,
//   //       },
//   //       devices: {
//   //         $cond: {
//   //           if: { $eq: ["$devices", []] },
//   //           then: null,
//   //           else: "$devices",
//   //         },
//   //       },
//   //     },
//   //   },
//   // ];
//   const pipeline = [
//     {
//       $match: {
//         _id: mongoose.Types.ObjectId(deviceId),
//       },
//     },

//     {
//       $limit: 1,
//     },
//   ];

//   const device = await DeviceModel.aggregate(pipeline);
//   // const device = await DeviceModel.findById(deviceId, { deviceToken: 1, auth: 1 }, { lean: true });
//   if (!device) {
//     throw new Error("Device not found");
//   }
//   if (device.deviceToken !== deviceToken) {
//     throw new Error("Device token mismatch");
//   }
//   if (device.auth.toString() !== uid) {
//     throw new Error("Device auth mismatch");
//   }
//   return true;
// };

const tokenValidator = async ({ token, type, userAgent, authTokenReference = "" }) => {
  const decodedToken = await joseJwtDecrypt(token);
  if (decodedToken.error) {
    throw new Error(decodedToken.error.message);
  }
  if (!decodedToken.payload) {
    throw new Error("Token payload not found");
  }
  if (decodedToken.payload.tokenType !== type) {
    console.log(decodedToken.payload.tokenType, type, "token type mismatch");
    throw new Error("Token type mismatch");
  }
  // if (decodedToken.payload.ip !== ip) {
  //   throw new Error("IP mismatch");
  // }
  if (decodedToken.payload.userAgent !== userAgent) {
    throw new Error("User agent mismatch");
  }
  let newAuthToken, newRefreshToken;
  if (!decodedToken.payload.deviceToken) {
    throw new Error("No deviceToken in authToken or refreshToken");
  }
  if (decodedToken.payload.tokenType === "refresh") {
    if (decodedToken.payload.authTokenReference !== authTokenReference) {
      throw new Error("Token reference mismatch");
    }
    const tokenPair = await generateTokenPair({
      payload: {
        uid: decodedToken.payload.uid,
        ref: decodedToken.payload.ref,
        deviceToken: decodedToken.payload.deviceToken,
        userType: decodedToken.payload.userType,
      },
    });
    newAuthToken = tokenPair.authToken;
    newRefreshToken = tokenPair.refreshToken;
  }
  return { decodedToken, newAuthToken, newRefreshToken };
};
export const generateTokenPair = async ({
  payload: { uid, ref, deviceToken, ip, userAgent, userType = "User" },
}) => {
  const authToken = await generateUserToken({
    _id: uid,
    profileId: ref,
    userType,
    tokenType: "auth",
    deviceToken,
    ip,
    userAgent,
  });
  const refreshToken = await generateUserToken({
    _id: uid,
    profileId: ref,
    userType,
    authTokenReference: authToken.split(".")[1],
    tokenType: "refresh",
    deviceToken,
  });
  return { authToken, refreshToken };
};

export const verifyJWT = async (data) => {
  console.log("verifyJWT function called");
  const { authToken, refreshToken, deviceToken, type, ip, userAgent } = data;
  let newAuthToken, newRefreshToken, uid, decode;
  if (!authToken || !refreshToken || !deviceToken || !type) {
    return {
      error: !authToken
        ? "Please send authToken"
        : !refreshToken
        ? "Please send refreshToken"
        : !deviceToken
        ? "Please send deviceToken"
        : !type
        ? "Please Specify UserType"
        : "Unable to verify token",
    };
  }

  try {
    console.log("About to validate token"); 
    decode = await tokenValidator({ token: authToken, type: "auth", ip, userAgent }).then((res) => {
      return res.decodedToken;
    });
  
   console.log("Device token from request: ", deviceToken); 
   console.log("Device token from JWT: ", decode.payload.deviceToken)
  
    if (decode.payload.userType !== type) {
      throw new Error("User type mismatch");
    }
  
 //  if (decode.payload.deviceToken !== deviceToken) {
 //  throw new Error(`Device token mismatch: got ${deviceToken} but expected ${decode.payload.deviceToken}`);
 // }
  
  } catch (error) {
    console.log(error, "error catch part authService")
    if (error.message !== "JWT expired") {
      console.log(error, "JWT EXPIRED*************")
      return {
        error: "json Invalid authorization token. " + error.message,
      };
    }
    decode = await tokenValidator({ token: refreshToken, type: "refresh", ip, userAgent })
      .then((res) => {
        newAuthToken = res.newAuthToken ? res.newAuthToken : null;
        newRefreshToken = res.newRefreshToken ? res.newRefreshToken : null;
        return res.decodedToken;
      })
      .catch((err) => {
        return { error: err.message };
      });
  }

  try {
    uid = decode.payload.uid;
    // await getUserProfile(uid, deviceToken, decode.payload.deviceId);

    return decode.payload.isTemporary
      ? {
          authId: uid,
          profileId: decode.payload.ref,
        }
      : {
          profile: {
            auth: uid,
            _id: decode.payload.ref,
          },
          authToken: newAuthToken,
          refreshToken: newRefreshToken,
        };
  } catch (error) {
    return {
      error: "verify jwt error",
    };
  }
};



