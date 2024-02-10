import { Router, application } from "express";
import * as SocialProfileController from "../Controller/socialProfileController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";

export const SocialProfileRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(SocialProfileRouter);
  this.use(path, middleware, SocialProfileRouter);
  return SocialProfileRouter;
};

SocialProfileRouter.get("/get_profile/:id", authMiddleware, SocialProfileController.viewProfile);
SocialProfileRouter.get("/get_profile", authMiddleware, SocialProfileController.viewProfile);
SocialProfileRouter.get("/get_followers/:id", authMiddleware, SocialProfileController.getFollowers);
SocialProfileRouter.post(
  "/toggle_follow_profile/:id",
  authMiddleware,
  SocialProfileController.followProfile,
);
SocialProfileRouter.get("/get_users", SocialProfileController.getUserProfiles);
SocialProfileRouter.patch(
  "/blockUserById/:id",
  authMiddleware,
  SocialProfileController.blockUserById,
);

SocialProfileRouter.get("/users",  authMiddleware, SocialProfileController.getAllUserProfile);
