import { Router, application } from "express";
import { authMiddleware } from "./Middleware/authMiddleware.js";
import * as ChatController from "../Controller/chatroomController.js";
export const ChatRouter = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(ChatRouter);
  this.use(path, middleware, ChatRouter);
  return ChatRouter;
};

ChatRouter.route("/all_chatrooms").get(authMiddleware, ChatController.getAllChatrooms);
ChatRouter.route("/chatroom/:chatroomId").get(authMiddleware, ChatController.getChatroom);
ChatRouter.route("/chatroom/:receiverId").post(authMiddleware, ChatController.sendMessage);
