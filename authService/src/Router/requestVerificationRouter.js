import { Router } from "express";
import { toggleRequestVerification } from "../Controller/requestVerificationController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";

export const RequestRouter = Router();

RequestRouter.route("/toggle_request_verification").post(authMiddleware, toggleRequestVerification);
