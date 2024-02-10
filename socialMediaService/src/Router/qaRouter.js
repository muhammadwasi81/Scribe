import { Router, application } from "express";
import * as QuestionController from "../Controller/questionController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";

export const QuestionRouter = Router();
application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(QuestionRouter);
  this.use(path, middleware, QuestionRouter);
  return QuestionRouter;
};

QuestionRouter.route("/create_question").post([authMiddleware, QuestionController.createQuestion]);
QuestionRouter.route("/update_question/:questionId").put([
  authMiddleware,
  QuestionController.updateQuestionById,
]);
QuestionRouter.route("/delete_question/:questionId").delete([
  authMiddleware,
  QuestionController.deleteQuestionById,
]);
QuestionRouter.route("/questions").get([authMiddleware, QuestionController.getQuestions]);

// QuestionRouter.route( "/question/:questionId" ).get( authMiddleware, QuestionController.getQuestionById );
// QuestionRouter.route( "/questions" ).get( authMiddleware, QuestionController.getQuestions );

// answer routes
