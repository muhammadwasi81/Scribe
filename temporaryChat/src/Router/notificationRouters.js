import { Router, application } from "express";
import notificationController from "../Controller/notificationController.js";
import { AuthMiddleware } from "./Middleware/AuthMiddleware.js";

export let notificationRouters = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(notificationRouters);
  this.use(path, middleware, notificationRouters);
  return notificationRouters;
};

notificationRouters.prefix("/notifications", AuthMiddleware, async function () {
  notificationRouters.route("/get").get(notificationController.GetAllNotifications);
  notificationRouters.route("/markAsRead").post(notificationController.MarkNotificationAsRead);
  notificationRouters
    .route("/markAllAsRead")
    .get(notificationController.MarkAllNotificationsAsRead);
  notificationRouters.route("/onAndOff").post(notificationController.notificationOnAndOff);
});
