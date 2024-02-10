// import { verifyToken } from '../../Utils/jwt.js'
import { verifyJWT } from "../../Utils/jwt.js";
import CustomError from "../../Utils/ResponseHandler/CustomError.js";
import { UserMiddlewareValidator } from "../../Utils/Validator/userValidator.js";

//User auth middleware
export const authMiddleware = async (req, res, next) => {
  console.time("authMiddleware");

  const { authorization } = req.headers;
  const refreshToken = req.headers.refreshtoken;
  const { ip, headers } = req;
  const forwardedIp = headers["forwarded"]?.split(";")[1].replace("for=", "");
  const userAgent = headers["user-agent"];
  console.log(ip, headers);
  if (!ip || !userAgent) {
    return next(CustomError.unauthorized("Cannot find user identifier and user-agent in headers"));
  }
  const deviceToken = req.headers.devicetoken ? req.headers.devicetoken : req.body.deviceToken;
  const { error } = UserMiddlewareValidator.validate({
    authToken: authorization,
    refreshToken,
  });

  console.time("verifyJWT");
  if (error) {
    console.timeEnd("verifyJWT");
    console.timeEnd("authMiddleware");
    return next(CustomError.unauthorized(error.message));
  }
  const verify = await verifyJWT({
    authToken: authorization,
    refreshToken,
    type: "Admin",
    deviceToken,
    ip: forwardedIp ? forwardedIp : ip,
    userAgent,
  });
  console.timeEnd("verifyJWT");

  console.time("verify error handling");
  if (verify.error) {
    console.timeEnd("verify error handling");
    console.timeEnd("authMiddleware");
    console.log("unable to verify jwt error => ", verify);
    return next(CustomError.unauthorized(verify.error));
  }
  console.timeEnd("verify error handling");

  console.time("verify success handling");
  const { authId, profileId, user, profile } = verify;

  if (authId && !profile) {
    // When temporary
    req.authId = authId;
    req.profileId = profileId;
    req.user = user;
  } else {
    // When not temporary
    req.user = profile;
    req.profileId = profile._id;
    req.authId = profile.auth;
    if (verify.authToken && verify.refreshToken) {
      res.set("authtoken", verify.authToken);
      res.set("refreshtoken", verify.refreshToken);
    }
  }
  console.timeEnd("verify success handling");

  console.timeEnd("authMiddleware");
  return next();
};
