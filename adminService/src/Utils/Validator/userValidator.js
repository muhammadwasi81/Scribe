import joi from "joi";
import { deviceRequired } from "./commonValidation.js";

//User validator
export const UserMiddlewareValidator = joi.object({
  authToken: joi.string().required(),
  // deviceToken: joi.string().required(),
  refreshToken: joi.string().required(),
});

//register validator
export const RegisterValidator = joi.object({
  userName: joi.string().required(),
  fullName: joi.string().required(),
  email: joi.string().email().required(),
  password: joi.string().required(),
  description: joi.string().required(), // TODO: change this to enum
  ...deviceRequired,
});
export const UserNameValidator = joi.object({
  username: joi.string().required().pattern(new RegExp("^[a-zA-Z0-9_]{3,30}$")),
});
//social register validator
export const SocialRegisterValidator = joi.object({
  socialType: joi.string().required().equal("apple", "facebook", "google"),
  accessToken: joi.string().required(),
  ...deviceRequired,
});

//login validator
export const LoginValidator = joi.object({
  email: joi.string().required(),
  password: joi.string().required(),
  ...deviceRequired,
});

//social login validator
export const SocialLoginValidator = joi.object({
  accessToken: joi.string().required(),
  socialType: joi.string().required().equal("apple", "facebook", "google"),

  ...deviceRequired,
});

//forget password validator
export const ForgotPasswordValidator = joi.object({
  email: joi.string().required(),
});
// resend otp validator
export const ResendOTPValidator = joi.object({
  email: joi.string().email().required(),
  // reason: joi.string().required().valid("login", "verification", "forgotPassword"),
});
//otp validator
export const verifyOTPValidator = joi.object({
  email: joi.string().email().required(),
  otp: joi.string().required(),
  ...deviceRequired,
});

export const ResetPasswordOTPValidator = joi.object({
  user_id: joi.string().required(),
  otp: joi.string().required(),
});

//reset password validator

export const ResetPasswordValidator = joi.object({
  password: joi.string().required(),
  otpId: joi.string().required(),
  ...deviceRequired,
});

//update profile validator
export const UpdateProfileValidator = joi.object({
  fullName: joi.string(),
  userName: joi.string(),
  email: joi.string().email(),
  description: joi.string(),
  bio: joi.string(),
  address: joi.string(),
});
export const LogoutValidator = joi.object({});
// export const ProfileValidator = joi.object({
//   ...deviceRequired,
//   user: joi.object().required(),
// });


export const approveReviewByIdValidator = joi.object({
  accepted: joi.boolean().required(),
});
export const approveBookByIdValidator = joi.object({
  accepted: joi.boolean().required(),
});
