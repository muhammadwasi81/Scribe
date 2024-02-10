import { application, Router } from "express";
import * as CommentController from "../Controller/commentController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const CommentRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(CommentRouter);
  this.use(path, middleware, CommentRouter);
  return CommentRouter;
};
CommentRouter.post("/create_comment/:id", authMiddleware, CommentController.createComment);
CommentRouter.put("/update_comment/:id", authMiddleware, CommentController.updateComment);
CommentRouter.delete("/delete_comment/:id", authMiddleware, CommentController.deleteComment);
CommentRouter.get("/get_comment_replies/:id", authMiddleware, CommentController.commentReplies);
CommentRouter.get("/get_post_comments/:id", authMiddleware, CommentController.commentsByPost);
