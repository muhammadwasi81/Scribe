import { application, Router } from "express";
import * as ReactionController from "../Controller/reactionController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const ReactionRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(ReactionRouter);
  this.use(path, middleware, ReactionRouter);
  return ReactionRouter;
};
ReactionRouter.post("/create_reaction/:id", authMiddleware, ReactionController.createReaction);
ReactionRouter.delete("/delete_reaction/:id", authMiddleware, ReactionController.deleteReaction);
