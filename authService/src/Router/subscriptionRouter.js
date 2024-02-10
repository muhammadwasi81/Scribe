import { Router, application } from "express";
import * as subscriptionController from "../Controller/subscriptionController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const SubscriptionRouter = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(SubscriptionRouter);
  this.use(path, middleware, SubscriptionRouter);
  return SubscriptionRouter;
};

SubscriptionRouter.route("/subscribe").post(
  authMiddleware,
  subscriptionController.subscriptionPurchased,
);

SubscriptionRouter.route("/subscribe/revoke").post(
  authMiddleware,
  subscriptionController.revokeSubscriptionExternal,
);

// new subscription
SubscriptionRouter.route("/buy_subscritpion").post(
  authMiddleware,
  subscriptionController.buySubscription,
);
