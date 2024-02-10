import { Router, application } from "express";
import * as AdminController from "../Controller/adminController.js";
// import { uploadSingleImage /*, uploadToService*/ } from "../Utils/MultipartData.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";
export const AdminRouter = Router();
//
AdminRouter.route("/register_admin").post(AdminController.Register);
AdminRouter.route("/login_admin").post(AdminController.Login);

