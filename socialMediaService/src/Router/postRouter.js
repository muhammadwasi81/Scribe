import { Router, application } from "express";
import * as postController from "../Controller/postController.js";
import { uploadMultipleImagesAndVideos, createPostMultiPart } from "../Utils/MultipartData.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
import { generateThumbnail } from "./Middleware/thumbnailgenerateMiddleware.js";
export const PostRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(PostRouter);
  this.use(path, middleware, PostRouter);
  return PostRouter;
};

PostRouter.route("/create_post").post([
  authMiddleware,
  createPostMultiPart.fields([
    {
      name: "attachments",
      maxCount: 4,
    },
  ]),
  generateThumbnail,
  postController.createPost,
]);
PostRouter.get("/post/:id", postController.getPostById);
PostRouter.get("/user_post/:userId", authMiddleware, postController.getPostByUser);
PostRouter.put(
  "/post/:id",
  authMiddleware,
  uploadMultipleImagesAndVideos.fields([
    {
      name: "attachments",
      maxCount: 4,
    },
  ]),
  postController.updatePost,
);
PostRouter.post(
  "/update_post/",
  authMiddleware,
  uploadMultipleImagesAndVideos.fields([
    {
      name: "attachments",
      maxCount: 4,
    },
  ]),
  postController.updatePost_V2,
);
PostRouter.delete("/post/:id", authMiddleware, postController.deletePost);
PostRouter.get("/posts/", authMiddleware, postController.getPosts);
PostRouter.post("/share_post/:postId", authMiddleware, postController.sharePost);
PostRouter.post("/report_post/", authMiddleware, postController.reportPost);
PostRouter.post("/hide_post/", authMiddleware, postController.hidePost);
