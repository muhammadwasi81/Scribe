import { Router, application } from "express";
import { authMiddleware } from "./Middleware/authMiddleware.js";
import * as NotificationController from "../Controller/notificationController.js";

export const NotificationRouter = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(NotificationRouter);
  this.use(path, middleware, NotificationRouter);
  return NotificationRouter;
};

NotificationRouter.route("/all_notifications").get(
  authMiddleware,
  NotificationController.getAllNotification,
);

NotificationRouter.route("/mark_notification_as_read/").post(
  authMiddleware,
  NotificationController.markNotificationAsRead,
);
NotificationRouter.route("/mark_all_notification_as_read").get(
  authMiddleware,
  NotificationController.markAllNotificationAsRead,
);
