import { Router, application } from "express";
import * as AuthController from "../Controller/authController.js";
import { uploadSingleImage /*, uploadToService*/ } from "../Utils/MultipartData.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const AuthRouter = Router();
//
AuthRouter.route("/register").post(AuthController.Register);
AuthRouter.route("/verify").get(AuthController.verifyLink);
AuthRouter.route("/login").post(AuthController.Login);
AuthRouter.route("/social_register").post(AuthController.SocialRegister);
AuthRouter.route("/social_login").post(AuthController.SocialLogin);

// // Forget Password APIs
AuthRouter.route("/forget_password").post(AuthController.ForgetPassword);
AuthRouter.route("/verify_otp").post(AuthController.VerifyOtp);
AuthRouter.route("/resend_otp").post(AuthController.ResendOtp);
AuthRouter.route("/check_username").post(AuthController.CheckUserName);
// AuthRouter.route('/logout').post(AuthController.Logout)

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(AuthRouter);
  this.use(path, middleware, AuthRouter);
  return AuthRouter;
};

AuthRouter.route("/resetpassword").post([authMiddleware, AuthController.ResetPassword]);

AuthRouter.route("/profile").put([
  uploadSingleImage.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  authMiddleware,
  AuthController.UpdateProfile,
]);
