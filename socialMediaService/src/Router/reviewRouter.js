import { Router, application } from "express";
import * as reviewRouter from "../Controller/reviewController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const ReviewRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(ReviewRouter);
  this.use(path, middleware, ReviewRouter);
  return ReviewRouter;
};

ReviewRouter.route("/create_review").post([authMiddleware, reviewRouter.createReview]);
ReviewRouter.route("/approve_review/:reviewId").get(reviewRouter.approveReviewById);
ReviewRouter.route("/book_reviews/:bookId").get(authMiddleware, reviewRouter.getReviewsByBookId);
