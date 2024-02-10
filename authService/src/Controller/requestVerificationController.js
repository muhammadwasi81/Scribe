import UserModel from "../DB/Model/userModel.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import requestVerificationModel from "./../DB/Model/requestVerificationModel.js";
import mongoose from "mongoose";

export const toggleRequestVerification = async (req, res, next) => {
  try {
    const { userId } = req.query;
    console.log({ userId });

    if (!userId) {
      return next(CustomError.badRequest("User ID is required"));
    }

    if (!mongoose.isValidObjectId(userId)) {
      return next(CustomError.badRequest("Invalid User ID"));
    }

    const findUser = await UserModel.findById(userId);
    console.log("findUser=>", findUser);

    findUser.verificationRequested = !findUser.verificationRequested;

    if (findUser.verificationRequested) {
      const existingRequest = await requestVerificationModel.findOne({ userId });
      console.log("existingRequest=>", existingRequest);
      if (!existingRequest) {
        const newRequest = new requestVerificationModel({ userId });
        await newRequest.save();
      } else {
        existingRequest.requestedAt = new Date();
        await existingRequest.save();
      }
    }

    await findUser.save();

    return next(
      CustomSuccess.createSuccess(
        {
          verificationStatus: findUser.verificationRequested ? "pending" : "not requested",
        },
        "Verification request updated successfully",
        200,
      ),
    );
  } catch (error) {
    console.error(error);
    return next(CustomError.createError(error.message));
  }
};
