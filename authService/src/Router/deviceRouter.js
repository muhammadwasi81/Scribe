import { Router, application } from "express";
import { authMiddleware } from "./Middleware/authMiddleware.js";
import * as DeviceController from "../Controller/deviceController.js";

export const DeviceRouter = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(DeviceRouter);
  this.use(path, middleware, DeviceRouter);
  return DeviceRouter;
};

// DeviceRouter.route( "/all_devices" ).get( authMiddleware, DeviceController.getAllDevices );

// DeviceRouter.route( "/device/:deviceId" ).get( authMiddleware, DeviceController.getDevice );

DeviceRouter.route("/update_device").post(authMiddleware, DeviceController.updateDeviceSetting);

DeviceRouter.route("/send_support_message").post(authMiddleware, DeviceController.sendSupportEmail);
