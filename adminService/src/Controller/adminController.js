import { hash } from "bcrypt";
import mongoose from "mongoose";
// import { UserResource } from "../../../authService/src/Utils/Resource/UserResource.js";
import { AdminModel } from "../DB/Model/adminModel.js";
import AuthModel from "../DB/Model/authModel.js";
import UserModel from "../DB/Model/userModel.js";
import { VerificationRequestModel } from "../DB/Model/verificationRequest.js";
import { generateTokenPair } from "../Utils/jwt.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { genSalt } from "../Utils/saltGen.js";
import { ReviewModel } from "../DB/Model/reviewModel.js";
import { LibraryModel } from "../DB/Model/libraryModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
// import MediaModel from "../DB/Model/media.js";
import { sendNotificationWithPayload } from "../Utils/Notification.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import {
  // UpdateProfileValidator,
  approveBookByIdValidator,
  approveReviewByIdValidator,
} from "../Utils/Validator/userValidator.js";
import { PostModel } from "../DB/Model/postModel.js";
import { reportModel } from "../DB/Model/reportModel.js";
import { ReportedPostModel } from "../DB/Model/reportedPostModel.js";
import { blockedUserModel } from "../DB/Model/blockModel.js";
import MediaModel from "../DB/Model/media.js";
import { PostResource } from "../Utils/Resource/postResource.js";
import { UserResource } from "../Utils/Resource/UserResource.js";
import { CommentModel } from "../DB/Model/commentModel.js";
import { ReactionModel } from "../DB/Model/reactionModel.js";
import { QuestionModel } from "../DB/Model/questionModel.js";
import { AnswerModel } from "../DB/Model/answerModel.js";
import SubscriptionTypeModel from "../DB/Model/subscriptionTypeModel.js";
import bcrypt from "bcrypt";
import SupportTicket from "../DB/Model/supportSchema.js";
import { sendEmails } from "../Utils/SendEmail.js";
import { ChatroomModel } from "../DB/Model/chatroomModel.js";
import { MessageModel } from "../DB/Model/messageModel.js";
import NoteModel from "../DB/Model/notes.js";
import requestVerificationModel from "../DB/Model/requestVerificationModel.js";

export const Register = async (req, res, next) => {
  const { email, password } = req.body;
  const { ip, headers } = req;
  const userAgent = headers["user-agent"];
  if (!email || !password || !ip || !userAgent) {
    return next(CustomError.badRequest("Email and password are required"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  const auth = new AuthModel({
    identifier: email,
    password,
    isVerified: true,
    userType: "Admin",
  });
  const admin = new AdminModel({
    auth: auth._id,
    fullName: "Admin",
  });
  auth.profile = admin._id;
  const { authToken, refreshToken } = await generateTokenPair({
    payload: {
      uid: auth._id.toString(),
      ref: admin._id.toString(),
      deviceToken: "1234567890",
      ip,
      userAgent,
    },
  });
  return Promise.all([auth.save(), admin.save()])
    .then(async () => {
      await session.commitTransaction();
      session.endSession();
      return next(CustomSuccess.created({ authToken, refreshToken }, "Registration successful"));
    })
    .catch(async (err) => {
      await session.abortTransaction();
      session.endSession();
      return next(CustomError.internal(err.message));
    });
};

export const Login = async (req, res, next) => {
  const { email, password } = req.body;
  const { ip, headers } = req;
  const forwardedIp = headers["forwarded"]
    ? headers["forwarded"].split(";")[1].replace("for=", "")
    : false;
  const userAgent = headers["user-agent"];

  const userAuth = await AuthModel.findOne({ identifier: email });
  console.log(userAuth, "userAuth");
  if (!userAuth) {
    return next(CustomError.unauthorized("Invalid email or password"));
  }

  const validPassword = await bcrypt.compare(password, userAuth.password);

  if (!validPassword) {
    return next(CustomError.unauthorized("Invalid email or password"));
  }

  const pipeline = [
    {
      $match: {
        _id: userAuth._id,
      },
    },
    {
      $lookup: {
        from: "admins",
        localField: "_id",
        foreignField: "auth",
        as: "profile",
      },
    },
    {
      $unwind: "$profile",
    },
  ];

  const authArray = await AuthModel.aggregate(pipeline);

  if (!authArray.length) {
    return next(CustomError.unauthorized("Invalid email or password"));
  }
  if (!authArray[0] && !authArray[0].isVerified) {
    return next(CustomError.unauthorized("Account is not verified"));
  }

  let auth = authArray[0];

  const { authToken, refreshToken } = await generateTokenPair({
    payload: {
      uid: auth._id.toString(),
      ref: auth.profile._id.toString(),
      deviceToken: "1234567890",
      ip: forwardedIp ? forwardedIp : ip,
      userAgent,
      userType: "Admin",
    },
  });
  return next(
    CustomSuccess.createSuccess({ authToken, refreshToken }, "Admin Login successfully", 200),
  );
};

export const GetListOfVerificationRequests = async (req, res, next) => {
  let { page, limit } = req.query;
  page = parseInt(page) ? parseInt(page) : 1;
  limit = parseInt(limit) ? parseInt(limit) : 20;
  try {
    const pipeline = [
      {
        $match: {
          isApproved: false,
          isDeclined: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ];
    const verificationRequests = await VerificationRequestModel.aggregate(pipeline);
    return next(
      CustomSuccess.createSuccess(
        verificationRequests,
        "Verification requests fetched successfully",
        200,
      ),
    );
  } catch (e) {
    return next(CustomError.internal(e.message));
  }
};

export const ProcessVerificationRequest = async (req, res, next) => {
  let { id, isApproved, isRejected } = req.body;
  if (isApproved && isRejected) {
    return next(CustomError.badRequest("Invalid request"));
  }

  if (!id || (!isApproved && !isRejected)) {
    return next(CustomError.badRequest("Invalid request"));
  }
  try {
    const request = await VerificationRequestModel.findByIdAndUpdate(
      id,
      {
        isApproved: isApproved ? true : false,
        isDeclined: isRejected ? true : false,
      },
      {
        new: true,
        lean: true,
      },
    );
    await UserModel.findByIdAndUpdate(request.user, {
      verified: isApproved ? true : false,
    });
    return next(CustomSuccess.createSuccess({}, "Request processed successfully", 200));
  } catch (e) {
    return next(CustomError.internal(e.message));
  }
};

export const approveBookById = async (req, res, next) => {
  try {
    try {
      await approveBookByIdValidator.validateAsync(req.query);
    } catch (error) {
      return next(CustomError.internal(error.message));
    }

    let { accepted } = req.query;
    accepted = JSON.parse(accepted);
    const book = await LibraryModel.findById(req.params.id).populate([{ path: "cover" }]);
    console.log(book, "book--------------------");
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    if (accepted) {
      book.isApproved = true;
      book.isRejected = false;

      if (book.newTitle && book.isApproved) {
        console.log(book.newTitle, "book.newTitle*****");
        book.title = book.newTitle;
        book.newTitle = null;
      }
      return UserModel.findById(book.user.toString())
        .populate([
          {
            path: "auth",
            model: AuthModel,
            populate: [
              {
                path: "devices",
                model: DeviceModel,
                populate: [
                  {
                    path: "deviceSetting",
                    model: DeviceSettingModel,
                    match: { isNotificationOn: true },
                  },
                ],
              },
            ],
          },
        ])
        .then((user) => {
          const { auth } = user;
          const { devices } = auth;

          // send email to user
          const title = "Your book has been approved";
          const body = "Tap to view it now.";
          const payload = {
            type: "library",
            bookId: book._id,
            bookImage: book.cover && book.cover.mediaUrl ? book.cover.mediaUrl : "",
          };
          const deviceTokens = devices.map((device) => {
            const token = device?.deviceSetting?.deviceToken;
            if (!token) {
              return new Promise((resolve) => resolve(true));
            }

            return sendNotificationWithPayload({
              token,
              title,
              body,
              data: payload,
            });
          });
          const newNotification = new NotificationModel({
            body,
            payload,
            title,
            auth,
          });
          Promise.all([...deviceTokens, newNotification.save()]).then(() => {
            book.save().then(() => {
              return next(new CustomSuccess(null, "Book approved successfully", 200));
            });
          });
          return;
        })
        .catch((error) => {
          return next(CustomError.internal(error.message));
        });
    } else {
      book.isApproved = false;
      book.isRejected = true;
      return UserModel.findById(book.user.toString())
        .populate([
          {
            path: "auth",
            model: AuthModel,
            populate: [
              {
                path: "devices",
                model: DeviceModel,
                populate: [
                  {
                    path: "deviceSetting",
                    model: DeviceSettingModel,
                    match: { isNotificationOn: true },
                  },
                ],
              },
            ],
          },
        ])
        .then((user) => {
          const { auth } = user;
          const { devices } = auth;

          // send email to user
          const title = "Your book was Rejected";
          const body = "Tap to view it now.";
          const payload = {
            type: "library",
            bookId: book._id,
            bookImage: book.cover && book.cover.mediaUrl ? book.cover.mediaUrl : "",
          };
          const deviceTokens = devices.map((device) => {
            const token = device?.deviceSetting?.deviceToken;
            if (!token) {
              return new Promise((resolve) => resolve(true));
            }

            return sendNotificationWithPayload({
              token,
              title,
              body,
              data: payload,
            });
          });
          const newNotification = new NotificationModel({
            body,
            payload,
            title,
            auth,
          });
          Promise.all([...deviceTokens, newNotification.save()]).then(() => {
            book.save().then(() => {
              return next(new CustomSuccess(null, "Book Rejected successfully", 200));
            });
          });
          return;
        })
        .catch((error) => {
          return next(CustomError.internal(error.message));
        });
    }
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getBookRequest = async (req, res, next) => {
  console.log("getBookRequest start");
  try {
    const books = await LibraryModel.aggregate([
      {
        $match: {
          $or: [
            { isApproved: false, isRejected: false },
            {
              isApproved: true,
              isRejected: false,
              newTitle: { $ne: null, $exists: true },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "media",
          localField: "user.image",
          foreignField: "_id",
          as: "userImage",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "book",
          as: "reviews",
        },
      },
      {
        $lookup: {
          from: "media",
          localField: "cover",
          foreignField: "_id",
          as: "cover",
        },
      },
      { $unwind: "$cover" },
      {
        $project: {
          title: 1,
          newTitle: 1,
          authorName: 1,
          description: 1,
          genre: 1,
          summary: 1,
          externalLink: 1,
          cover: "$cover.mediaUrl",
          manuscript: 1,
          createdAt: 1,
          updatedAt: 1,
          reviews: "$reviews",
          user: {
            _id: 1,
            id: "$user._id",
            fullName: 1,
            userName: 1,
            image: {
              $cond: [
                { $gt: [{ $size: "$userImage" }, 0] },
                { $arrayElemAt: ["$userImage.mediaUrl", 0] },
                "public/uploads/default.png",
              ],
            },
          },
        },
      },
      {
        $project: {
          userImage: 0,
        },
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              then: { $avg: { $ifNull: ["$reviews.rating", 0] } },
              else: 0,
            },
          },
          reviewCount: { $size: { $ifNull: ["$reviews", []] } },
        },
      },
    ]);
    console.log(books, "books in getBookRequest");
    books.map((e) => {
      console.log(e.newTitle, "e.newTitle");
      e.title = e.newTitle;
    });

    if (!books) {
      throw new CustomError("No Books found", 404);
    }

    return next(new CustomSuccess(books, "Book retrieved successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getBookList = async (req, res, next) => {
  try {
    const books = await LibraryModel.aggregate([
      {
        $match: {
          isApproved: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "media",
          localField: "user.image",
          foreignField: "_id",
          as: "userImage",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "book",
          as: "reviews",
        },
      },
      {
        $lookup: {
          from: "media",
          localField: "cover",
          foreignField: "_id",
          as: "cover",
        },
      },
      { $unwind: "$cover" },
      {
        $project: {
          title: 1,
          authorName: 1,
          description: 1,
          genre: 1,
          summary: 1,
          externalLink: 1,
          cover: "$cover.mediaUrl",
          manuscript: 1,
          createdAt: 1,
          updatedAt: 1,
          reviews: "$reviews",
          user: {
            _id: 1,
            id: "$user._id",
            fullName: 1,
            userName: 1,
            image: {
              $cond: [
                { $gt: [{ $size: "$userImage" }, 0] },
                { $arrayElemAt: ["$userImage.mediaUrl", 0] },
                "public/uploads/default.png",
              ],
            },
          },
        },
      },
      {
        $project: {
          userImage: 0,
        },
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              then: { $avg: { $ifNull: ["$reviews.rating", 0] } },
              else: 0,
            },
          },
          reviewCount: { $size: { $ifNull: ["$reviews", []] } },
        },
      },
    ]);

    if (!books) {
      throw new CustomError("No Books found", 404);
    }

    return next(new CustomSuccess(books, "Book retrieved successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const approveReviewById = async (req, res, next) => {
  try {
    try {
      await approveReviewByIdValidator.validateAsync(req.query);
    } catch (error) {
      return next(CustomError.internal(error.message));
    }

    let { accepted } = req.query;
    accepted = JSON.parse(accepted);
    const { reviewId } = req.params;
    const review = await ReviewModel.findById(reviewId).lean();

    if (!review) {
      throw new CustomError("Review not found", 404);
    }

    if (accepted) {
      review.isApproved = true;
      review.isRejected = false;

      const updatedReview = await ReviewModel.findByIdAndUpdate(reviewId, review, {
        new: true,
        runValidators: true,
      });
      return next(
        CustomSuccess.createSuccess({ review: updatedReview }, "Review approved successfully", 200),
      );
    }

    review.isApproved = false;
    review.isRejected = true;

    const updatedReview = await ReviewModel.findByIdAndUpdate(reviewId, review, {
      new: true,
      runValidators: true,
    });

    return next(
      CustomSuccess.createSuccess({ review: updatedReview }, "Review approved successfully", 200),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getReviewRequest = async (req, res, next) => {
  try {
    let reviewRequest = await ReviewModel.aggregate([
      {
        $match: {
          isApproved: false,
          isRejected: false,
        },
      },
    ]);
    console.log(reviewRequest, "reviewRequest");
    reviewRequest = await ReviewModel.populate(reviewRequest, [
      {
        path: "book",
      },
      {
        path: "user",
      },
    ]);

    if (!reviewRequest?.length) {
      throw new CustomError("Review not found", 404);
    }

    // const updatedReview = await ReviewModel.findByIdAndUpdate(reviewId, review, {
    //   new: true,
    //   runValidators: true,
    // });

    return next(
      CustomSuccess.createSuccess(
        { review: reviewRequest },
        "Review Request fetched successfully",
        200,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @desc Delete Review By Id
// @route DELETE /review/deleteReview/:reviewId
// @access Private
export const deleteReviewbyId = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    console.log(reviewId, "reviewId");
    const review = await ReviewModel.findByIdAndDelete(reviewId);
    console.log(review, "review******");
    if (!review) {
      throw new CustomError("Review not found", 404);
    }
    return next(CustomSuccess.createSuccess({}, "Review deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @desc Delete Book
// @route DELETE /book/deleteBook:/id
// @access Private
export const deleteBook = async (req, res, next) => {
  console.log(req.params, "req.params");
  const { id } = req.params;
  console.log(id, "req.params.id");
  try {
    const book = await LibraryModel.findByIdAndDelete(id);
    console.log(book, "book");
    if (!book) {
      return next(CustomError.internal("Book not found"), 400);
    }
    return next(CustomSuccess.createSuccess(book, "Book deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// export const GetAllUser = async (req, res, next) => {
//   try {
//     const pipeline = [
//       {
//         $match: {
//           // $or: [{ userName: req.body.userName }, { _id: mongoose.Types.ObjectId(req.profileId) }],
//         },
//       },
//       {
//         $lookup: {
//           from: "media",
//           localField: "image",
//           foreignField: "_id",
//           as: "image",
//         },
//       },
//       {
//         $unwind: {
//           path: "$image",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//     ];
//     const user = await UserModel.aggregate(pipeline);

//     return next(CustomSuccess.createSuccess(user, "All user fetched successfully", 200));
//   } catch (error) {
//     return next(CustomError.createError(error.message, 400));
//   }
// };

export const GetUsers = async (req, res, next) => {
  let { page, limit } = req.query;
  page = parseInt(page) ? parseInt(page) : 1;
  limit = parseInt(limit) ? parseInt(limit) : 10;
  try {
    const pipeline = [
      {
        $lookup: {
          from: "media",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      {
        $unwind: {
          path: "$image",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "auth",
          foreignField: "_id",
          as: "auth",
        },
      },
      {
        $unwind: {
          path: "$auth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subscriptiontypes",
          localField: "auth.subscriptions",
          foreignField: "_id",
          as: "subscriptions",
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $skip: (page - 1) * limit,
      },
    ];
    const users = await UserModel.aggregate(pipeline);
    const usersResource = users.map((user) => {
      const auth = { ...user.auth };
      delete user.auth;
      const userIsFree =
        !auth.activeSubscription || auth.activeSubscription === "free" ? true : false;
      const userIsBasic =
        auth.activeSubscription &&
        user.activeSubscription === ("unlimited_notes_monthly" || "unlimited_notes_yearly")
          ? true
          : false;
      const userIsPremium =
        !(!auth.activeSubscription || auth.activeSubscription === "free" ? true : false) &&
        !userIsBasic &&
        auth.activeSubscription
          ? true
          : false;

      console.log(auth, "***************************");
      return {
        ...user,
        auth: auth._id,
        email: auth.identifier?.includes("@") ? auth.identifier : "",
        password: auth.password?.includes("@") ? auth.password : "",
        subscriptions: user.subscriptions,
      };
    });
    return next(CustomSuccess.createSuccess(usersResource, "Users fetched successfully", 200));
  } catch (e) {
    return next(CustomError.internal(e.message));
  }
};

// export const UpdateProfile = async (req, res, next) => {
//   try {
//     const { error } = UpdateProfileValidator.validate(req.body);
//     // return next(CustomError.createError(req.authId, 200));
//     if (error) {
//       const message = error.details.map((err) => err.message).toString();
//       throw new Error(message);
//     }
//     const pipeline = [
//       {
//         $match: {
//           $or: [{ userName: req.body.userName }, { _id: mongoose.Types.ObjectId(req.profileId) }],
//         },
//       },
//       {
//         $lookup: {
//           from: "media",
//           localField: "image",
//           foreignField: "_id",
//           as: "image",
//         },
//       },
//       {
//         $unwind: {
//           path: "$image",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//     ];
//     const user = await UserModel.aggregate(pipeline);
//     if (!user) {
//       throw new Error("User not found");
//     }
//     if (user.length > 1) {
//       throw new Error("User name already exist");
//     }
//     if (user[0]._id.toString() !== req.profileId.toString()) {
//       throw new Error("User name already exist");
//     }
//     const userProfile = user[0];
//     const image = req.files && req.files.image && req.files.image[0] ? req.files.image[0] : null;

//     const imageUrl = req.headers["fileName"]
//       ? "public/uploads/" + req.headers["fileName"]
//       : image
//       ? image.path
//       : null;
//     const profileData = { ...req.body };

//     delete profileData.email;

//     const offloadPayload = {
//       profileId: req.profileId,
//       updateObj: profileData,
//     };

//     if (imageUrl) {
//       offloadPayload.mediaUrl = imageUrl;
//       offloadPayload.mediaId = userProfile.image._id ? userProfile.image._id.toString() : null;

//       userProfile.image = {
//         _id: userProfile.image._id ? userProfile.image._id.toString() : null,
//         mediaUrl: imageUrl,
//       };
//     }
//     const profile = Object.keys(userProfile).reduce((acc, key) => {
//       if (profileData[key]) {
//         acc[key] = profileData[key];
//       } else {
//         acc[key] = userProfile[key];
//       }
//       return acc;
//     }, {});
//     // if (!media) {
//     //   queries.push(new Promise((resolve) => resolve(true)));
//     // }

//     // const profile = UserModel.findOneAndUpdate({ _id: req.profileId }, profileData, {
//     //   new: true,
//     //   session,
//     //   lean: true,
//     // }).populate(["image"]);
//     // queries.push(profile);
//     setImmediate(async () => {
//       workerPool.offloadUpdateProfile(offloadPayload);
//     });

//     const userResource = new UserResource(profile);

//     console.timeEnd("UpdateProfile");
//     return next(
//       CustomSuccess.createSuccess(userResource.UserObject, "profile updated successfully", 200),
//     );
//   } catch (error) {
//     console.timeEnd("UpdateProfile");
//     if (error.keyValue && error.keyValue.userName) {
//       return next(CustomError.createError("Username is already taken.", 200));
//     }
//     return next(CustomError.createError(error.message, 400));
//   }
// };

export const deleteUser = async (req, res, next) => {
  const { authId, profileId } = req.body;
  if (!authId || !profileId) {
    return next(CustomError.createError("authId and profileId is required", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const findAuthUser = await AuthModel.findOne({
      // _id: Types.ObjectId(authId.toString()),
      _id: authId,
    });
    if (!findAuthUser) {
      session.abortTransaction();
      return next(CustomError.createError("No User found with authId", 404));
    }

    const findProfileUser = await UserModel.findOne({
      // _id: Types.ObjectId(profileId.toString()),
      _id: profileId,
    });
    if (!findProfileUser) {
      session.abortTransaction();
      return next(CustomError.createError("No User found with profileId", 404));
    }

    const auth = AuthModel.deleteOne(
      {
        _id: authId,
      },
      {
        session,
      },
    );
    const profile = UserModel.deleteOne(
      {
        _id: profileId,
      },
      {
        session,
      },
    );
    const posts = PostModel.deleteMany(
      {
        user: profileId,
      },
      {
        session,
      },
    );
    const comments = CommentModel.deleteMany(
      {
        user: profileId,
      },
      {
        session,
      },
    ).session(session);
    const reactions = ReactionModel.deleteMany(
      {
        user: profileId,
      },
      {
        session,
      },
    ).session(session);
    const chats = ChatroomModel.deleteMany(
      {
        users: profileId,
      },
      {
        session,
      },
    ).session(session);
    console.log(chats.deletedCount, "chats.deletedCount");
    const messages = MessageModel.deleteMany(
      {
        sender: profileId,
      },
      {
        session,
      },
    ).session(session);
    console.log(messages.deletedCount, "messages.deletedCount");
    const notifications = NotificationModel.deleteMany(
      {
        auth: profileId,
      },
      {
        session,
      },
    ).session(session);
    console.log(notifications, "notifications");
    const libraries = LibraryModel.deleteMany(
      {
        user: profileId,
      },
      {
        session,
      },
    ).session(session);
    console.log(libraries, "libraries");
    const notes = NoteModel.deleteMany(
      {
        userId: profileId,
      },
      {
        session,
      },
    ).session(session);
    console.log(notes, "notes");
    return await Promise.all([
      auth,
      profile,
      posts,
      comments,
      reactions,
      chats,
      messages,
      notifications,
      libraries,
      notes,
    ]).then(() => {
      session.commitTransaction();
      return next(CustomSuccess.createSuccess({}, "Account deleted successfully", 200));
    });
  } catch (e) {
    session.abortTransaction();
    console.log(e);
    return next(CustomError.internal("Something went wrong"));
  }
};

// export const sendNotificationByUserId = async (req, res, next) => {
//   try {
//     const auth = req.body.authId;
//     if (!auth?.length || !auth) {
//       return next(CustomError.createError("User Auth Id is required", 400));
//     }

//     const user = await AuthModel.findOne({ _id: auth }).populate({
//       path: "devices",
//       model: DeviceModel,
//       populate: [
//         {
//           path: "deviceSetting",
//           model: DeviceSettingModel,
//           match: { isNotificationOn: true },
//         },
//       ],
//     });
//     console.log(user, "sdddddddddddddddddddddddddddddddd")
//     if (!user) {
//       return next(CustomError.createError("No User found", 404));
//     }

//     const { title, body } = req.body;
//     if (!title?.length || !title) {
//       return next(CustomError.createError("title is required", 400));
//     }
//     if (!body?.length || !body) {
//       return next(CustomError.createError("body is required", 400));
//     }

//     const deviceTokens = user.devices.map((device) => {
//       const token = device?.deviceSetting?.deviceToken;
//       if (!token) {
//         return new Promise((resolve) => resolve(true));
//       }
//       return sendNotificationWithPayload({
//               title,
//               body,
//               token,
//               data: {
//                type: "notification",
//           },
//         });
//        });
//     console.log("deviceTokens->", deviceTokens)

//     Promise.all([...deviceTokens]).then(() => {
//       return next(new CustomSuccess(null, "Notication send successfully", 200));
//     });
//     return;
//   } catch (error) {
//     console.log(error);
//     return next(CustomError.internal("Something went wrong"));
//   }
// };

export const sendNotificationByUserId = async (req, res, next) => {
  try {
    const auth = req.body.authId;
    if (!auth) {
      return next(CustomError.createError("User Auth Id is required", 400));
    }

    const users = await AuthModel.findOne({ _id: auth }).populate({
      path: "devices",
      model: DeviceModel,
      populate: [
        {
          path: "deviceSetting",
          model: DeviceSettingModel,
          match: { isNotificationOn: true },
        },
      ],
    });

    if (!users || users.length === 0) {
      return next(CustomError.createError("No Users found", 404));
    }

    const { title, body } = req.body;
    if (!title || !body) {
      return next(CustomError.createError("title and body are required", 400));
    }

    const deviceTokens = [];

    users.forEach((user) => {
      user.devices.forEach((device) => {
        const token = device.deviceSetting?.deviceToken;
        if (token) {
          deviceTokens.push(
            sendNotificationWithPayload({
              title,
              body,
              token,
              data: {
                type: "notification",
              },
            }),
          );
        }
      });
    });

    Promise.all(deviceTokens)
      .then(() => {
        return next(new CustomSuccess(null, "Notification sent successfully", 200));
      })
      .catch((error) => {
        console.error(error);
        return next(CustomError.internal("Something went wrong"));
      });
  } catch (error) {
    console.error(error);
    return next(CustomError.internal("Something went wrong"));
  }
};

export const getReports = async (req, res, next) => {
  const posts = ReportedPostModel.find({
    isRejected: false,
    isApproved: false,
  }).populate([
    {
      path: "post",
      model: PostModel,
      populate: [
        {
          path: "user",
          model: UserModel,
          populate: {
            path: "image",
            model: MediaModel,
          },
        },
        {
          path: "attachments",
          model: MediaModel,
        },
        {
          path: "originalPost",
          model: PostModel,
          populate: [
            {
              path: "user",
            },
            {
              path: "attachments",
              model: MediaModel,
            },
          ],
        },
      ],
    },
    {
      path: "reports",
      model: reportModel,
      populate: {
        path: "reporter",
        model: UserModel,
        populate: {
          path: "image",
          model: MediaModel,
        },
      },
    },
  ]);
  return await posts
    .then((data) => {
      const reports = data.map((report) => {
        const postResource = new PostResource(report.post);
        const _reports = report.reports
          ? report.reports.map((report) => {
              const reporter = report.reporter ? new UserResource(report.reporter) : null;
              return {
                _id: report._id,
                reporter: reporter ? reporter.UserObject : null,
                reason: report.reason,
                additionalInfo: report.additionalInfo,
                createdAt: report.createdAt,
              };
            })
          : [];
        return {
          _id: report._id,
          post: postResource,
          reports: _reports,
        };
      });
      return next(CustomSuccess.createSuccess(reports, "Reports fetched successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const resolveReport = async (req, res, next) => {
  const { reportId, isApproved } = req.body;
  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    return next(CustomError.createError("reportId is required", 400));
  }
  if (isApproved === undefined) {
    return next(CustomError.createError("isApproved is required", 400));
  }
  console.log("isApproved => ", isApproved);
  console.log("reportId => ", reportId);
  const report = ReportedPostModel.findOneAndUpdate(
    {
      _id: reportId,
    },
    {
      isApproved: isApproved ? true : false,
      isRejected: !isApproved ? true : false,
    },
  );

  return await report
    .then((data) => {
      console.log("data => ", data);
      console.log("isApproved => ", isApproved);

      return next(CustomSuccess.createSuccess({}, "Report resolved successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const getReportById = async (req, res, next) => {
  const { reportId } = req.params;

  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    return next(CustomError.createError("reportId is required", 400));
  }
  const report = ReportedPostModel.findById(reportId).populate([
    {
      path: "post",
      model: PostModel,
      populate: [
        {
          path: "user",
          model: UserModel,
        },
        {
          path: "originalPost",
          model: PostModel,
          populate: {
            path: "user",
          },
        },
      ],
    },
    {
      path: "reports",
      model: reportModel,
      populate: {
        path: "reporter",
        model: UserModel,
      },
    },
  ]);
  return report
    .then((data) => {
      return next(CustomSuccess.createSuccess(data, "Report fetched successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const getBlockedUsers = async (req, res, next) => {
  const blockedUsers = blockedUserModel.find({}).populate({
    path: "user",
    model: UserModel,
    populate: {
      path: "image",
      model: MediaModel,
    },
  });
  return await blockedUsers
    .then((data) => {
      return next(CustomSuccess.createSuccess(data, "Blocked users fetched successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const blockUser = async (req, res, next) => {
  const { userId } = req.body;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return next(CustomError.createError("userId is required", 400));
  }
  const blockedUser = blockedUserModel.create({
    user: userId,
  });
  return blockedUser
    .then(() => {
      return next(CustomSuccess.createSuccess({}, "User blocked successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const unblockUser = async (req, res, next) => {
  const { userId } = req.body;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return next(CustomError.createError("userId is required", 400));
  }
  const blockedUser = blockedUserModel.findOneAndDelete({
    user: userId,
  });
  return await blockedUser
    .then(() => {
      return next(CustomSuccess.createSuccess({}, "User unblocked successfully", 200));
    })
    .catch((error) => {
      return next(CustomError.internal("Something went wrong : " + error.message));
    });
};
export const verifyAuthToken = async (req, res, next) => {
  const { authId } = req;
  if (!authId) return next(CustomError.unauthorized("Unauthorized"));
  const auth = await AuthModel.findOne({ _id: authId });
  if (!auth) return next(CustomError.unauthorized("Unauthorized"));
  return next(CustomSuccess.createSuccess({}, "Authorized", 200));
};

// @desc   Get all questions
// @route  GET /admin/questions
// @access Private
export const getQuestions = async (req, res, next) => {
  try {
    let questions = await QuestionModel.find({})
      .populate({
        path: "createdBy",
        select: ["fullName", "userName", "image"],
        populate: {
          path: "image",
          select: "mediaUrl",
        },
      })
      .lean();
    console.log("questions Data: ", questions);
    if (!questions.length) {
      return next(CustomError.notFound("No questions found"));
    }
    return next(new CustomSuccess(questions, "Questions fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @desc   Delete question by id
// @route  DELETE /admin/delete_question/:questionId
// @access Private
export const deleteQuestionById = async (req, res, next) => {
  console.log("deleteQuestionById called");
  const { id } = req.params;
  const { profileId } = req;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid question ID"));
  }
  try {
    const deletedQuestion = await QuestionModel.findByIdAndDelete({
      _id: id,
      createdBy: profileId,
    }).lean();
    console.log("deletedQuestion: ", deletedQuestion);
    if (!deletedQuestion) {
      return next(CustomError.notFound("Question not found"));
    }
    return next(new CustomSuccess(deletedQuestion, "Question deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// Answers
export const deleteAnswerById = async (req, res, next) => {
  const { id } = req.params;
  const { profileId } = req;
  console.log(id, "req.params");
  if (!id) return next(CustomError.badRequest("Invalid request"));
  try {
    const answer = await AnswerModel.findByIdAndDelete({
      _id: id,
      user: profileId,
    });
    console.log(answer, "answer");
    if (!answer) return next(CustomError.notFound("Answer not found"));
    return next(new CustomSuccess(answer, "Answer deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getAnswersByQuestionId = async (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose) return next(CustomError.badRequest("Invalid request"));
  try {
    const answers = await AnswerModel.find({
      question: id,
    })
      .populate([
        {
          path: "question",
          select: "question",
        },
        {
          path: "user",
          select: ["fullName", "userName", "image"],
          populate: {
            path: "image",
            select: "mediaUrl",
          },
        },
      ])
      .lean();
    console.log(answers, "answers");
    if (!answers) return next(CustomError.notFound("Answers not found"));
    answers.forEach((answer) => {
      answer.user.image = answer.user.image
        ? answer.user.image.mediaUrl
        : "public/images/default.png";
    });
    return next(new CustomSuccess(answers, "Answers fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const getAllAnswers = async (req, res, next) => {
  try {
    const answers = await AnswerModel.find({})
      .populate([
        {
          path: "question",
          select: "question",
        },
        {
          path: "user",
          select: ["fullName", "userName", "image"],
          populate: {
            path: "image",
            select: "mediaUrl",
          },
        },
      ])
      .lean();
    console.log(answers, "answers");
    if (!answers) return next(CustomError.notFound("Answers not found"));
    answers.forEach((answer) => {
      answer.user.image = answer.user.image
        ? answer.user.image.mediaUrl
        : "public/images/default.png";
    });
    return next(new CustomSuccess(answers, "Answers fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @desc   Get all posts
// @route  GET /posts
// @access Private
export const getPosts = async (req, res, next) => {
  try {
    console.time("getPosts");
    let { page = 1, limit = 10 } = req.query;
    console.log(req.query, "req.query");
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;
    console.log("hurray");
    const posts = await PostModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "media",
          localField: "user.image",
          foreignField: "_id",
          as: "user.image",
        },
      },
      {
        $unwind: "$user.image",
      },
      {
        $lookup: {
          from: "comments",
          localField: "comments",
          foreignField: "_id",
          as: "comments",
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      { $sort: { updatedAt: -1 } },
    ]);
    console.log(posts, "posts");
    if (!posts) {
      return next(CustomError.notFound("Posts not found"));
    }

    return next(CustomSuccess.createSuccess(posts, "Posts fetched successfully", 200));
  } catch (error) {
    console.log(error.message);
    return next(error);
  }
};

// @Desc Delete posts
// @Route DELETE /delete_post/:id
// @access Private
export const deletePostById = async (req, res, next) => {
  const { id } = req.params;
  const { profileId } = req;
  console.log(id, "req.params.id");
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid post ID"));
  }
  try {
    const deletedPost = await PostModel.findByIdAndDelete({
      _id: id,
      user: profileId,
    }).lean();
    console.log("deletedPost: ", deletedPost);
    if (!deletedPost) {
      return next(CustomError.notFound("Post not found"));
    }
    return next(new CustomSuccess(deletedPost, "Post deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @Desc Delete Comment By Id
// @Route DELETE /delete_comment/:id
// @access Private
export const deleteCommentById = async (req, res, next) => {
  const { id } = req.params;
  const { profileId } = req;
  console.log(id, "req.params.id");
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(CustomError.badRequest("Invalid comment ID"));
  }
  try {
    const deletedComment = await CommentModel.findByIdAndDelete({
      _id: id,
      user: profileId,
    }).lean();
    console.log("deletedComment: ", deletedComment);
    if (!deletedComment) {
      return next(CustomError.notFound("Comment not found"));
    }
    return next(new CustomSuccess(deletedComment, "Comment deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// @desc Get all subscriptions
// @route GET /get_subscriptions
// @access Private
export const getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await SubscriptionTypeModel.find();

    let total = 0;
    let currentMonthTotal = 0;
    let previousMonthTotal = 0;
    const yearlyTotals = {};

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    subscriptions.forEach((subscription) => {
      total += subscription.price;

      const subscriptionDate = new Date(subscription.createdAt);
      const year = subscriptionDate.getFullYear();
      const month = subscriptionDate.getMonth();

      if (year === currentYear && month === currentMonth) {
        currentMonthTotal += subscription.price;
      }

      if (year === previousYear && month === previousMonth) {
        previousMonthTotal += subscription.price;
      }

      if (!yearlyTotals[year]) {
        yearlyTotals[year] = 0;
      }

      yearlyTotals[year] += subscription.price;
    });
    const data = {
      total,
      currentMonthTotal,
      previousMonthTotal,
      yearlyTotals,
    };
    return next(CustomSuccess.createSuccess(data, "Subscriptions fetched successfully", 200));
  } catch (error) {
    console.log("error => ", error.message);
    if (error instanceof CustomError) {
      return next(error);
    }
    return next(CustomError.internal(error.message));
  }
};

// @desc get all usersData
// @route GET /get_all_users
// @access Private
export const countUsers = async (req, res, next) => {
  try {
    const totalAuthUsers = await UserModel.countDocuments();
    const totalSocialUsers = await AuthModel.countDocuments();
    const iosDevices = await DeviceModel.countDocuments({
      deviceType: "ios",
    });
    const androidDevices = await DeviceModel.countDocuments({
      deviceType: "android",
    });
    const totalBooks = await LibraryModel.countDocuments();
    const totalSubscriptions = await SubscriptionTypeModel.countDocuments();
    const totalPosts = await PostModel.countDocuments();
    const data = {
      totalAuthUsers,
      totalSocialUsers,
      iosDevices,
      androidDevices,
      totalPosts,
      totalBooks,
      totalSubscriptions,
    };
    console.log(data, "Total Data");
    return next(CustomSuccess.createSuccess(data, "Data fetched successfully", 200));
  } catch (error) {
    console.log(error.message);
    return next(CustomError.internal(error.message));
  }
};

// export const getAllSupportTickets = async (req, res, next) => {
//   try {
//     let tickets = await SupportTicket.find({}).sort({ createdAt: -1 })
//      .populate({
//         path: 'userId',
//         model: 'User',
//         populate: {
//             path: 'authId',
//             select: 'identifier password',
//             model: 'Auth'
//         }
//     });

//      tickets = tickets.map(ticket => {
//        let ticketObj = ticket.toObject();

//        if (!ticketObj.authId.password?.includes('@')) {
//            ticketObj.authId?.password = '';
//        }
//        ticketObj.user = ticketObj.authId;
//        delete ticketObj.authId;
//        return ticketObj;
//      });

//      console.log(tickets, "ticketsData")
//      if (!tickets) return next(CustomSuccess.createSuccess("No tickets found", 200));
//     return next(CustomSuccess.createSuccess(tickets, "Tickets fetched successfully", 200));
//   } catch (error) {
//     console.log("error", error.message);
//     return next(CustomError.badRequest(error.message));
//   }
// }

export const getAllSupportTickets = async (req, res, next) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "auths",
          localField: "authId",
          foreignField: "_id",
          as: "auth",
        },
      },
      {
        $unwind: {
          path: "$auth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "auth._id",
          foreignField: "auth",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "media",
          localField: "user.image",
          foreignField: "_id",
          as: "userImage",
        },
      },
      {
        $unwind: {
          path: "$userImage",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          subject: 1,
          message: 1,
          userEmail: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.userName": 1,
          "user.fullName": 1,
          "user.image": "$userImage",
          "auth.identifier": 1,
          "auth.password": 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const tickets = await SupportTicket.aggregate(pipeline);
    console.log(tickets, "ticketsData in response");

    const ticketsResource = tickets.map((ticket) => {
      const user = { ...ticket.user, ...ticket.auth };
      delete ticket.user;
      delete ticket.auth;
      console.log(user, "userData");
      user.email = user?.identifier?.includes("@") || "";
      user.password = user?.password?.includes("@") || "";

      return {
        ...ticket,
        user,
      };
    });
    console.log(ticketsResource, "ticketsResource");
    return next(CustomSuccess.createSuccess(ticketsResource, "Tickets fetched successfully", 200));
  } catch (error) {
    console.log("error", error.message);
    return next(CustomError.badRequest(error.message));
  }
};

export const sendSupportEmail = async (req, res, next) => {
  const { reply, userEmail } = req.body;
  const subject = "Customer Support";
  try {
    if (!reply || !userEmail) return next(CustomError.badRequest("Please enter reply"));

    const sendEmail = await sendEmails(userEmail, subject, reply, null);
    if (!sendEmail) return next(CustomError.badRequest("Email not sent"));
    console.log(sendEmail, "sendEmailResponse");
    return res.status(201).json({ message: "Email sent successfully", status: true });
  } catch (error) {
    console.log("error", error.message);
    return next(CustomError.badRequest(error.message));
  }
};

// TODO: NEW WALA ONE
export const approveBookByIdOne = async (req, res, next) => {
  try {
    try {
      await approveBookByIdValidator.validateAsync(req.query);
    } catch (error) {
      return next(CustomError.internal(error.message));
    }

    let { accepted } = req.query;
    accepted = JSON.parse(accepted);
    const book = await LibraryModel.findById(req.params.id).populate([{ path: "cover" }]);
    console.log(book, "book--------------------");
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    if (accepted) {
      book.isApproved = true;
      book.isRejected = false;

      // if (book.newTitle && book.isApproved) {
      //   console.log(book.newTitle, "book.newTitle*****");
      //   book.title = book.newTitle;
      //   book.newTitle = null;
      // }

      if (book.isApproved) {
        if (book.newTitle) {
          console.log("book.newTitle=>", book.newTitle);
          book.title = book.newTitle;
          book.newTitle = null;
        }

        if (book.newAuthorName) {
          console.log("book.newAuthorName=>", book.newAuthorName);
          book.authorName = book.newAuthorName;
          book.newAuthorName = null;
        }

        if (book.newDescription) {
          console.log("book.newDescription=>", book.newDescription);
          book.description = book.newDescription;
          book.newDescription = null;
        }

        if (book.newGenre) {
          console.log("book.newGenre=>", book.newGenre);
          book.genre = book.newGenre;
          book.newGenre = null;
        }

        if (book.newExternalLink) {
          console.log("book.newExternalLink=>", book.newExternalLink);
          book.externalLink = book.newExternalLink;
          book.newExternalLink = null;
        }

        if (book.newSummary) {
          console.log("book.newSummary=>", book.newSummary);
          book.summary = book.newSummary;
          book.newSummary = null;
        }

        if (book.newCover) {
          console.log("book.newCover=>", book.newCover);
          book.cover = book.newCover;
          book.newCover = null;
        }
      }
      return UserModel.findById(book.user.toString())
        .populate([
          {
            path: "auth",
            model: AuthModel,
            populate: [
              {
                path: "devices",
                model: DeviceModel,
                populate: [
                  {
                    path: "deviceSetting",
                    model: DeviceSettingModel,
                    match: { isNotificationOn: true },
                  },
                ],
              },
            ],
          },
        ])
        .then((user) => {
          const { auth } = user;
          const { devices } = auth;

          // send email to user
          const title = "Your book has been approved";
          const body = "Tap to view it now.";
          const payload = {
            type: "library",
            bookId: book._id,
            bookImage: book.cover && book.cover.mediaUrl ? book.cover.mediaUrl : "",
          };
          const deviceTokens = devices.map((device) => {
            const token = device?.deviceSetting?.deviceToken;
            if (!token) {
              return new Promise((resolve) => resolve(true));
            }

            return sendNotificationWithPayload({
              token,
              title,
              body,
              data: payload,
            });
          });
          const newNotification = new NotificationModel({
            body,
            payload,
            title,
            auth,
          });
          Promise.all([...deviceTokens, newNotification.save()]).then(() => {
            book.save().then(() => {
              return next(new CustomSuccess(null, "Book approved successfully", 200));
            });
          });
          return;
        })
        .catch((error) => {
          return next(CustomError.internal(error.message));
        });
    } else {
      book.isApproved = false;
      book.isRejected = true;
      return UserModel.findById(book.user.toString())
        .populate([
          {
            path: "auth",
            model: AuthModel,
            populate: [
              {
                path: "devices",
                model: DeviceModel,
                populate: [
                  {
                    path: "deviceSetting",
                    model: DeviceSettingModel,
                    match: { isNotificationOn: true },
                  },
                ],
              },
            ],
          },
        ])
        .then((user) => {
          const { auth } = user;
          const { devices } = auth;

          // send email to user
          const title = "Your book was Rejected";
          const body = "Tap to view it now.";
          const payload = {
            type: "library",
            bookId: book._id,
            bookImage: book.cover && book.cover.mediaUrl ? book.cover.mediaUrl : "",
          };
          const deviceTokens = devices.map((device) => {
            const token = device?.deviceSetting?.deviceToken;
            if (!token) {
              return new Promise((resolve) => resolve(true));
            }

            return sendNotificationWithPayload({
              token,
              title,
              body,
              data: payload,
            });
          });
          const newNotification = new NotificationModel({
            body,
            payload,
            title,
            auth,
          });
          Promise.all([...deviceTokens, newNotification.save()]).then(() => {
            book.save().then(() => {
              return next(new CustomSuccess(null, "Book Rejected successfully", 200));
            });
          });
          return;
        })
        .catch((error) => {
          return next(CustomError.internal(error.message));
        });
    }
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// TODO: NEW WALA ONE
export const getBookRequestOne = async (req, res, next) => {
  try {
    const books = await LibraryModel.aggregate([
      {
        $match: {
          $or: [
            { isApproved: false, isRejected: false },
            {
              isApproved: true,
              newTitle: { $ne: null, $exists: true },
              newAuthorName: { $ne: null, $exists: true },
              newDescription: { $ne: null, $exists: true },
              newGenre: { $ne: null, $exists: true },
              newSummary: { $ne: null, $exists: true },
              newExternalLink: { $ne: null, $exists: true },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "media",
          localField: "user.image",
          foreignField: "_id",
          as: "userImage",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "book",
          as: "reviews",
        },
      },
      {
        $lookup: {
          from: "media",
          localField: "cover",
          foreignField: "_id",
          as: "cover",
        },
      },
      { $unwind: "$cover" },
      {
        $project: {
          title: 1,
          newTitle: 1,
          authorName: 1,
          newAuthorName: 1,
          description: 1,
          newDescription: 1,
          genre: 1,
          newGenre: 1,
          summary: 1,
          newSummary: 1,
          externalLink: 1,
          newExternalLink: 1,
          cover: "$cover.mediaUrl",
          newCover: 1,
          manuscript: 1,
          createdAt: 1,
          updatedAt: 1,
          reviews: "$reviews",
          user: {
            _id: 1,
            id: "$user._id",
            fullName: 1,
            userName: 1,
            image: {
              $cond: [
                { $gt: [{ $size: "$userImage" }, 0] },
                { $arrayElemAt: ["$userImage.mediaUrl", 0] },
                "public/uploads/default.png",
              ],
            },
          },
        },
      },
      {
        $project: {
          userImage: 0,
        },
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              then: { $avg: { $ifNull: ["$reviews.rating", 0] } },
              else: 0,
            },
          },
          reviewCount: { $size: { $ifNull: ["$reviews", []] } },
        },
      },
    ]);
    // books.map((e) => {
    //   console.log(e.newTitle, "eeeeeeee");
    //   e.title = e.newTitle;
    // });
    // console.log(books, "books))))))");

    books.map((e) => {
      console.log("BOOKS.MAP FUNCTION-->", e);
      e.title = e.newTitle || e.title;
      e.authorName = e.newAuthorName || e.authorName;
      e.description = e.newDescription || e.description;
      e.genre = e.newGenre || e.genre;
      e.summary = e.newSummary || e.summary;
      e.externalLink = e.newExternalLink || e.externalLink;
      e.cover = e.newCover || e.cover;
    });
    console.log("Books-00000000000000000000000000>", books);

    if (!books) {
      throw new CustomError("No Books found", 404);
    }

    return next(new CustomSuccess(books, "Book retrieved successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// Get Users V2
export const GetUsersV2 = async (req, res, next) => {
  let { page, limit, email, userName, fullName } = req.query;
  page = parseInt(page) ? parseInt(page) : 1;
  limit = parseInt(limit) ? parseInt(limit) : 10;

  try {
    const matchStage = {};
    if (userName) {
      matchStage.userName = { $regex: new RegExp(userName), $options: "i" };
    }
    if (fullName) {
      matchStage.fullName = { $regex: new RegExp(fullName), $options: "i" };
    }

    let pipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "media",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      {
        $unwind: {
          path: "$image",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "auth",
          foreignField: "_id",
          as: "auth",
        },
      },
      {
        $unwind: {
          path: "$auth",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (email) {
      pipeline.push({
        $match: {
          "auth.identifier": { $regex: new RegExp(email), $options: "i" },
        },
      });
    }

    pipeline = pipeline.concat([
      {
        $lookup: {
          from: "subscriptiontypes",
          localField: "auth.subscriptions",
          foreignField: "_id",
          as: "subscriptions",
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    const users = await UserModel.aggregate(pipeline);
    const userResources = users.map((user) => {
      const auth = { ...user.auth };
      delete user.auth;
      const userIsFree =
        !auth.activeSubscription || auth.activeSubscription === "free" ? true : false;
      const userIsBasic =
        auth.activeSubscription &&
        user.activeSubscription === ("unlimited_notes_monthly" || "unlimited_notes_yearly")
          ? true
          : false;
      const userIsPremium =
        !(!auth.activeSubscription || auth.activeSubscription === "free" ? true : false) &&
        !userIsBasic &&
        auth.activeSubscription
          ? true
          : false;
     
      return {
        ...user,
        auth: auth._id,
        email: auth.identifier?.includes("@") ? auth.identifier : "",
        password: auth.password?.includes("@") ? auth.password : "",
        subscriptions: user.subscriptions,
      };
    });

    let countPipeline = [
      {
        $match: matchStage,
      },
      ...(email
        ? [
            {
              $lookup: {
                from: "auths",
                localField: "auth",
                foreignField: "_id",
                as: "auth",
              },
            },
            {
              $unwind: "$auth",
            },
            {
              $match: {
                $or: [
                  { "auth.identifier": { $regex: new RegExp(email, "i") } },
                  { "auth.password": { $regex: new RegExp(`^${email}$`, "i") } },
                ],
              },
            },
          ]
        : []),
      {
        $count: "total",
      },
    ];

    const countResult = await UserModel.aggregate(countPipeline);
    const count = countResult.length > 0 ? countResult[0].total : 0;

    return next(
      CustomSuccess.createSuccess(
        {
          users: userResources,
          count: count,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
        },
        "Users fetched successfully",
        200,
      ),
    );
  } catch (e) {
    return next(CustomError.internal(e.message));
  }
};

//@Desc: get pending request
//@Route: GET /get_pending_request
//@Access: Private
export const getPendingVerificationRequests = async (req, res, next) => {
  try {
    const usersWithRequestedVerification = await UserModel.find({
      verificationRequested: true,
    }).populate([
      {
        path: "auth",
        model: AuthModel,
        select: "identifier _id",
      },
      {
        path: "image",
        model: MediaModel,
        select: "mediaUrl",
      },
    ]);

    const verificationRequests = await requestVerificationModel.find({
      userId: { $in: usersWithRequestedVerification.map((user) => user._id) },
      status: "pending",
    });
    console.log("verificationRequests => ", verificationRequests);

    // Construct payload with user info and corresponding request _id
    const payload = usersWithRequestedVerification.map((user) => {
      const correspondingRequest = verificationRequests.find((request) =>
        request.userId.equals(user._id),
      );
      return {
        userId: user._id,
        fullName: user.fullName,
        userName: user.userName,
        email: user.auth.identifier,
        image: user.image ? user.image.mediaUrl : null,
        // verificationRequested: user.verificationRequested,
        createdAt: user.createdAt,
        requestId: correspondingRequest ? correspondingRequest._id : null,
      };
    });

    return next(CustomSuccess.createSuccess(payload, "Pending requests fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const acceptVerificationRequest = async (req, res, next) => {
  try {
    const { requestId } = req.query;
    console.log("requestId => ", requestId);

    const verificationRequest = await requestVerificationModel.findById(requestId);
    if (!verificationRequest) {
      return next(CustomError.notFound("Verification request not found"));
    }

    verificationRequest.status = "accepted";
    await verificationRequest.save();

    const user = await UserModel.findById(verificationRequest.userId);
    if (user) {
      user.verificationRequested = false;
      await user.save();
    }

    return next(CustomSuccess.createSuccess({}, "Verification request accepted", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const rejectVerificationRequest = async (req, res, next) => {
  try {
    const { requestId } = req.query;

    const verificationRequest = await requestVerificationModel.findById(requestId);
    if (!verificationRequest) {
      return next(CustomError.notFound("Verification request not found"));
    }
    verificationRequest.status = "rejected";
    await verificationRequest.save();

    const user = await UserModel.findById(verificationRequest.userId);
    if (user) {
      user.verificationRequested = false;
      await user.save();
    }

    return next(CustomSuccess.createSuccess({}, "Verification request rejected", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
