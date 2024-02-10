import { Router } from "express";
import * as AdminController from "../Controller/adminController.js";
// import { uploadSingleImage /*, uploadToService*/ } from "../Utils/MultipartData.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const AdminRouter = Router();

AdminRouter.route("/register_admin").post(AdminController.Register);
AdminRouter.route("/login_admin").post(AdminController.Login);
AdminRouter.route("/get_verification_users").get(
  authMiddleware,
  AdminController.GetListOfVerificationRequests,
);
AdminRouter.route("/verify_token").get(authMiddleware, AdminController.verifyAuthToken);
AdminRouter.route("/verify_user").post(authMiddleware, AdminController.ProcessVerificationRequest);
// TODO: books
AdminRouter.route("/book/approveBookById/:id").get(authMiddleware, AdminController.approveBookById);
AdminRouter.route("/book/getBookRequest").get(authMiddleware, AdminController.getBookRequest);
AdminRouter.route("/book/getBookList").get(authMiddleware, AdminController.getBookList);
AdminRouter.route("/book/deleteBook/:id").delete(authMiddleware, AdminController.deleteBook);
// Todo: //Reviews
AdminRouter.route("/review/approveReviewById/:reviewId").get(
  authMiddleware,
  AdminController.approveReviewById,
);
AdminRouter.route("/review/getReviewRequest").get(authMiddleware, AdminController.getReviewRequest);
AdminRouter.route("/review/deleteReview/:reviewId").delete(
  authMiddleware,
  AdminController.deleteReviewbyId,
);

// AdminRouter.route("/user/GetAllUser").get(authMiddleware, AdminController.GetAllUser);
AdminRouter.route("/users").get(authMiddleware, AdminController.GetUsers);
AdminRouter.route("/all_users").get(authMiddleware, AdminController.GetUsersV2);

AdminRouter.route("/user/delete").delete(authMiddleware, AdminController.deleteUser);
AdminRouter.route("/user/block").post(authMiddleware, AdminController.blockUser);
AdminRouter.route("/user/unblock").post(authMiddleware, AdminController.unblockUser);
// getblocked users
AdminRouter.route("/user/blocked_users").get(authMiddleware, AdminController.getBlockedUsers);
AdminRouter.route("/user/notification/sendNotificationByUserId").post(
  authMiddleware,
  AdminController.sendNotificationByUserId,
);
AdminRouter.route("/reported_content").get(authMiddleware, AdminController.getReports);
AdminRouter.route("/reported_content/:reportId").get(authMiddleware, AdminController.getReportById);
AdminRouter.route("/resolve_report").post(authMiddleware, AdminController.resolveReport);

// QUESTIONS
AdminRouter.route("/delete_question/:id").delete([
  authMiddleware,
  AdminController.deleteQuestionById,
]);

AdminRouter.route("/questions").get([authMiddleware, AdminController.getQuestions]);

// ANSWERS
AdminRouter.route("/delete_answer/:id").delete([authMiddleware, AdminController.deleteAnswerById]);
AdminRouter.route("/getAllAnswers").get([authMiddleware, AdminController.getAllAnswers]);

// GET POSTS
AdminRouter.get("/posts", authMiddleware, AdminController.getPosts);
// DELETE POST
AdminRouter.delete("/delete_post/:id", authMiddleware, AdminController.deletePostById);
// DELETE COMMENTS
AdminRouter.delete("/delete_comment/:id", authMiddleware, AdminController.deleteCommentById);

// GET ALL SUBSCRIPTIONS
AdminRouter.route("/get_subscriptions").get(authMiddleware, AdminController.getAllSubscriptions);

// GET ALL USERS
AdminRouter.route("/get_all_users").get(authMiddleware, AdminController.countUsers);

// Get All support tickets
AdminRouter.route("/all_support_message").get(authMiddleware, AdminController.getAllSupportTickets);
AdminRouter.route("/send_support_email").post(authMiddleware, AdminController.sendSupportEmail);

// NEW ROUTES FOR EXISITNG APIs
AdminRouter.route("/book/approveBookByIdOne/:id").post(
  authMiddleware,
  AdminController.sendSupportEmail,
);
AdminRouter.route("/book/getBookRequestOne").get(authMiddleware, AdminController.getBookRequest);

// get verification requests
AdminRouter.route("/get_pending_request").get(
  authMiddleware,
  AdminController.getPendingVerificationRequests,
);
AdminRouter.route("/accept_verification_request").post(
  authMiddleware,
  AdminController.acceptVerificationRequest,
);
AdminRouter.route("/reject_verification_request").post(
  authMiddleware,
  AdminController.rejectVerificationRequest,
);
