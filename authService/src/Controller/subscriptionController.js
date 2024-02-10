import mongoose from "mongoose";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import AuthModel from "../DB/Model/authModel.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import axios from "axios";
import SubscriptionTypeModel from "../DB/Model/subscriptionTypeModel.js";

export const subscriptionPurchased = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { authId } = req;
  const { identifier, expiry } = req.body;
  try {
    if (!authId) {
      throw new CustomError("authId not found", 401);
    }
    if (!identifier) {
      throw new CustomError("identifier not found", 400);
    }
    if (
      ![
        "free",
        "custom_offer_premium_monthly",
        "custom_offer_premium_yearly",
        "premium_monthly",
        "premium_yearly",
        "unlimited_notes_monthly",
        "unlimited_notes_yearly",
      ].includes(identifier)
    ) {
      throw new CustomError(
        "identifier must be one of the following:free, custom_offer_premium_monthly, custom_offer_premium_yearly, premium_monthly, premium_yearly, unlimited_notes_monthly, unlimited_notes_yearly",
        400,
      );
    }
    const options = { session, new: false };
    console.log(expiry);
    await AuthModel.findByIdAndUpdate(
      authId,
      {
        $set: {
          activeSubscription: identifier,
          subscriptionExpiry: identifier === "free" ? null : expiry,
        },
      },
      options,
    );
    await session.commitTransaction();
    session.endSession();
    return next(CustomSuccess.ok("subscription purchased successfully"));
  } catch (error) {
    console.log("error => ", error);
    await session.abortTransaction();
    session.endSession();
    if (error instanceof CustomError) {
      return next(error);
    }
    return next(CustomError.internal(error.message));
  }
};

export const revokeSubscriptionExternal = async (req, res, next) => {
  const { authId, profileId } = req;
  const { encrptedText } = req.body;
  try {
    if (!authId) {
      throw new CustomError("authId not found", 401);
    }
    if (!profileId) {
      throw new CustomError("profileId not found", 401);
    }
    if (!encrptedText) {
      throw new CustomError("encrptedText not found", 400);
    }
    const validateText =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiR3l0TkhDRE1yVXhZQklKZllSZktUQkh2VWxQc2tfS1QifQ.OUN2fDwXLBsbXfA833FlBWG7-qvZUMbhPBeN7rAfZv8";

    if (encrptedText === validateText) {
      return next(
        CustomSuccess.createSuccess(
          { decryptedText: "sk_KTGytNHCDMrUxYBIJfYRfKTBHvUlP" },
          "Text decrypt successfully",
          200,
        ),
      );
    }

    return next(CustomError.internal("Wrong text Provided"));
  } catch (error) {
    console.log("error => ", error);
    if (error instanceof CustomError) {
      return next(error);
    }
    return next(CustomError.internal(error.message));
  }
};

// export const revokeSubscriptionExternal = async (req, res, next) => {
//   const { authId, profileId } = req;
//   const { identifier } = req.body;
//   try {
//     if (!authId) {
//       throw new CustomError("authId not found", 401);
//     }
//     if (!profileId) {
//       throw new CustomError("profileId not found", 401);
//     }
//     if (!identifier) {
//       throw new CustomError("identifier not found", 400);
//     }
//     if (
//       ![
//         "free",
//         "custom_offer_premium_monthly",
//         "custom_offer_premium_yearly",
//         "premium_monthly",
//         "premium_yearly",
//         "unlimited_notes_monthly",
//         "unlimited_notes_yearly",
//       ].includes(identifier)
//     ) {
//       throw new CustomError(
//         "identifier must be one of the following:free, custom_offer_premium_monthly, custom_offer_premium_yearly, premium_monthly, premium_yearly, unlimited_notes_monthly, unlimited_notes_yearly",
//         400,
//       );
//     }

//     const revokeSub = await axios.post(
//       `https://api.revenuecat.com/v1/subscribers/${authId}/subscriptions/${identifier}/revoke`,
//       // `https://api.revenuecat.com/v1/subscribers/6428e8015496a88866e2901b/subscriptions/custom_offer_premium_monthly/revoke`,
//       {},
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: "Bearer sk_KTGytNHCDMrUxYBIJfYRfKTBHvUlP",
//         },
//       },
//     );
//     console.log("Subscription revoke by ==>", authId);
//     // console.log("revokeSub ==>", revokeSub);
//     console.log("revokeSub ==>", revokeSub);
//     return res.status(revokeSub.response.status).json({
//       data: revokeSub.response.data,
//       message: revokeSub.response.statusText,
//       status: revokeSub.response.status,
//     });
//     // return next(
//     //   CustomSuccess.createSuccess(
//     //     revokeSub.response.data,
//     //     revokeSub.response.statusText,
//     //     revokeSub.response.status,
//     //   ),
//     // );

//     // return next(CustomSuccess.ok(revokeSub));
//   } catch (error) {
//     console.log("error => ", error);
//     // if (error instanceof CustomError) {
//     return res.status(error.response.status).json({
//       data: error.response.data,
//       message: error.response.statusText,
//       status: error.response.status,
//     });
//     //   return next(error);
//     // }
//     // return next(
//     //   CustomError.DataWithErrors(
//     //     error?.response?.data ? error?.response?.data : {},
//     //     error?.response?.statusText ? error?.response?.statusText : "Something went wrong",
//     //     error?.response?.status ? error?.response?.status : 500,
//     //   ),
//     // );
//   }
// };



// @desc Buy a new subscription
// @route POST /buy_subscritpion
// @access Public

export const buySubscription = async (req, res, next) => {
  const { profileId } = req;
  console.log("authId:)))))))))))))) ", profileId);
  const { title, price } = req.body;
  try {
    if (!profileId) {
      throw new CustomError("profile not found", 401);
    }
    if (!title || !price) {
      throw new CustomError("These Fields are required", 400);
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const options = { session };
    await SubscriptionTypeModel.findOneAndUpdate(
      {
        user: profileId,
        isActiveSubscription: true,
      },
      {
        isActiveSubscription: false,
      },
      {
        options,
      },
    );
    const expiryDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
    const subscription = await SubscriptionTypeModel.create(
      [
        {
          title,
          price,
          user: profileId,
          subscriptionDuration: title === "free" ? null : expiryDate,
          subscriptionPlan: title,
        },
      ],
      options,
    );
    console.log("profile", profileId);
    console.log("subscription ", subscription);
    const uddateSubscription = await AuthModel.findOneAndUpdate(
      { profile: profileId },
      {
        $push: { subscriptions: subscription[0]._id },
      },
      options,
    );
    console.log("subscription => ", uddateSubscription);
    await session.commitTransaction();
    session.endSession();
    return next(
      CustomSuccess.createSuccess(subscription, "Subscription created successfully", 200),
    );
  } catch (error) {
    console.log("error => ", error);
    if (error instanceof CustomError) {
      return next(error);
    }
    return next(CustomError.internal(error.message));
  }
};
