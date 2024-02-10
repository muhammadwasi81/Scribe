import { Router, application } from "express";
import * as AnswerController from "../Controller/answerController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const AnswerRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(AnswerRouter);
  this.use(path, middleware, AnswerRouter);
  return AnswerRouter;
};

AnswerRouter.route("/create_answer").post([authMiddleware, AnswerController.createAnswer]);
AnswerRouter.route("/update_answer/").put([authMiddleware, AnswerController.updateAnswerById]);
AnswerRouter.route("/question_answers/:id").get([
  authMiddleware,
  AnswerController.getAnswersByQuestionId,
]);
