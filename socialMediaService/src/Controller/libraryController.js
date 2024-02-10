import { LibraryModel } from "../DB/Model/libraryModel.js";
import MediaModel from "../DB/Model/media.js";
// import { uid } from "uid/secure";
import axios from "axios";
import { fileFromPathSync } from "formdata-node/file-from-path";
import { FormData } from "formdata-node";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { config } from "dotenv";
import mongoose from "mongoose";
import { ReviewModel } from "../DB/Model/reviewModel.js";
import UserModel from "..//DB/Model/userModel.js";
import { sendNotificationWithPayload } from "../Utils/Notifications.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import AuthModel from "../DB/Model/authModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";

config();

const LIBRARY_MEDIA_SERVICE_URL = process.env.LIBRARY_MEDIA_SERVICE_URL;
const uploadFileToMediaService = async ({ file, session, profileId }) => {
  const mediaType = file.mimetype.split("/")[0];
  const mediaUrl = `public/uploads/library/${file.filename}`;

  const formData = new FormData();
  const readBuffer = fileFromPathSync(file.path, file.filename, { type: file.mimetype });
  formData.append("media", readBuffer, file.filename);

  const headers = {
    "Content-Type": `multipart/form-data;`,
  };

  const response = await axios.post(LIBRARY_MEDIA_SERVICE_URL, formData, { headers });
  if (response.status !== 201) {
    throw new Error("Error while uploading file to media service");
  }

  const media = new MediaModel({
    mediaType,
    mediaUrl,
    profile: profileId,
    userType: "User",
  });
  await media.save({ session });

  return media._id;
};

export const createLibrary = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Upload book cover to media service
    const coverFile = req.files && req.files.cover ? req.files.cover[0] : null;
    if (!coverFile) {
      throw new CustomError("Please upload a book cover", 400);
    }
    const coverUrl = await uploadFileToMediaService({
      file: coverFile,
      session,
      profileId: req.profileId,
    });

    // Upload manuscripts to media service, if any
    const manuscriptUrl = req.files && req.files.manuscripts ? req.files.manuscripts[0] : null;
    let manuscript;
    if (manuscriptUrl) {
      manuscript = await uploadFileToMediaService({
        file: manuscriptUrl,
        session,
        profileId: req.profileId,
      });
    }

    // Create library object
    const { title, authorName, description, genre, summary, externalLink } = req.body;
    const library = new LibraryModel({
      title,
      authorName,
      genre,
      externalLink,
      description,
      summary,
      cover: coverUrl,
      manuscript: manuscript,
      user: req.profileId,
    });
    await library.save({ session });

    // Commit transaction and send success response
    await session.commitTransaction();
    session.endSession();

    return next(
      new CustomSuccess(
        {
          message: "Please give Scribble team up to 48 hours to approve your request",
          bookId: library._id,
        },
        "Library created successfully",
        201,
      ),
    );
  } catch (error) {
    // Abort transaction and send error response
    await session.abortTransaction();
    session.endSession();
    return next(CustomError.internal(error.message));
  }
};
export const approveBookById = async (req, res, next) => {
  try {
    const book = await LibraryModel.findById(req.params.id).populate([{ path: "cover" }]);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    // book.isApproved = true;
    book.isApproved = false;
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
          const token = device.deviceSetting.deviceToken;
          if (!token) {
            return new Promise(() => true);
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
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
export const updateBookById = async (req, res, next) => {
  const { bookId } = req.params;
  if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
    throw new CustomError("Book not found", 404);
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const book = await LibraryModel.findById(bookId);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    if (book.user.toString() !== req.profileId) {
      throw new CustomError("You are not authorized to update this book", 401);
    }

    // Upload new book cover to media service, if provided
    let coverUrl = book.cover;
    const coverFile = req.files && req.files.cover ? req.files.cover[0] : null;
    if (coverFile) {
      coverUrl = await uploadFileToMediaService({
        file: coverFile,
        session,
        profileId: req.profileId,
      });
    }

    // Upload new manuscripts to media service, if provided
    let manuscript = book.manuscript;
    const manuscriptFile = req.files && req.files.manuscript ? req.files.manuscript[0] : null;
    if (manuscriptFile) {
      manuscript = await uploadFileToMediaService({
        file: manuscriptFile,
        session,
        profileId: req.profileId,
      });
    }

    // Update book fields
    if (book.isApproved) {
      book.newTitle = req.body.title;
    }
    book.authorName = req.body.authorName || book.authorName;
    book.genre = req.body.genre || book.genre;
    book.externalLink = req.body.externalLink || book.externalLink;
    book.description = req.body.description || book.description;
    book.summary = req.body.summary || book.summary;
    book.cover = coverUrl;
    book.manuscript = manuscript;

    await book.save({ session });
    await session.commitTransaction();
    session.endSession();
    return next(
      new CustomSuccess(
        { message: "Please give Scribble team up to 48 hours to approve your request", bookId },
        "Book updated successfully",
        200,
      ),
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(CustomError.internal(error.message));
  }
};

export const getBookById = async (req, res, next) => {
  try {
    const bookId = req.params.bookId;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new CustomError("Invalid book ID", 400);
    }

    const book = await LibraryModel.findById(bookId)
      .populate({
        path: "user",
        select: "fullName userName image",
        populate: { path: "image", select: "mediaUrl" },
      })
      .populate({ path: "cover", select: "mediaUrl" })
      .populate({ path: "manuscript", select: "mediaUrl" })
      .lean();

    if (!book) {
      throw new CustomError("Book not found", 404);
    }
    if (!book.isApproved) {
      throw new CustomError("Book is not approved yet", 404);
    }
    const reviews = await ReviewModel.find({ book: bookId, isApproved: true })
      .populate({
        path: "user",
        select: "fullName userName image",
        populate: { path: "image", select: "mediaUrl" },
      })
      .lean();

    const reviewCount = reviews.length ? reviews.length : 0;
    const ratingSum = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = reviewCount ? ratingSum / reviewCount : 0.0;
    book.user.id = book.user._id;
    book.user.image = book.user.image ? book.user.image.mediaUrl : "public/uploads/default.png";
    book.cover = book.cover ? book.cover.mediaUrl : "";
    book.manuscript = book.manuscript ? book.manuscript.mediaUrl : "";
    const bookWithRating = { ...book, avgRating, reviewCount };

    return next(new CustomSuccess({ book: bookWithRating }, "Book retrieved successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// export const getBooks = async (req, res, next) => {
//   try {
//     const books = await LibraryModel.find({
//       isApproved: true,
//     })
//       .populate({ path: "user", select: "fullName" })
//       .populate({ path: "cover", select: "mediaUrl" })
//       .populate({ path: "manuscript", select: "mediaUrl" });

//     if (!books) {
//       throw new CustomError("No Books found", 404);
//     }

//     return next(new CustomSuccess(books, "Book retrieved successfully", 200));
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };
export const getBooks = async (req, res, next) => {
  try {
    let books = await LibraryModel.aggregate([
      {
        $match: {
          isApproved: true,
          isRejected: { $ne: true },
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
        $addFields: {
          reviews: {
            $filter: {
              input: "$reviews",
              as: "review",
              cond: { $eq: ["$$review.isApproved", true] },
            },
          },
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
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
	
    if (!books) {
      throw new CustomError("No Books found", 404);
    }
	 books = await LibraryModel.populate(books, [
      {
        path: "reviews.user",
        model: "User",
        select: "userName",
      },
    ]);
    return next(new CustomSuccess(books, "Book retrieved successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};


// todo yeh wala
export const updateBookByIdOne = async (req, res, next) => {
  const { bookId } = req.params;
  if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
    throw new CustomError("Book not found", 404);
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const book = await LibraryModel.findById(bookId);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    if (book.user.toString() !== req.profileId) {
      throw new CustomError("You are not authorized to update this book", 401);
    }

    // Upload new book cover to media service, if provided
    let coverUrl = book.cover;
    const coverFile = req.files && req.files.cover ? req.files.cover[0] : null;
    if (coverFile) {
      coverUrl = await uploadFileToMediaService({
        file: coverFile,
        session,
        profileId: req.profileId,
      });
    }

    let newCoverUrl = book.newCover;
    const newCoverFile = req.files && req.files.newCover ? req.files.newCover[0] : null;
    if (newCoverFile) {
      newCoverUrl = await uploadFileToMediaService({
        file: newCoverFile,
        session,
        profileId: req.profileId,
      });
    }
    console.log("newCoverFile->", newCoverFile);

    // Upload new manuscripts to media service, if provided
    let manuscript = book.manuscript;
    const manuscriptFile = req.files && req.files.manuscript ? req.files.manuscript[0] : null;
    if (manuscriptFile) {
      manuscript = await uploadFileToMediaService({
        file: manuscriptFile,
        session,
        profileId: req.profileId,
      });
    }

    // Update book fields
    if (book.isApproved) {
      book.newTitle = req.body.title;
      book.newAuthorName = req.body.authorName;
      book.newDescription = req.body.newDescription;
      book.newGenre = req.body.newGenre;
      book.newExternalLink = req.body.newExternalLink;
      book.newSummary = req.body.newSummary;
      book.newCover = newCoverUrl; // set the new cover field
    }
    book.authorName = req.body.authorName || book.authorName;
    book.genre = req.body.genre || book.genre;
    book.externalLink = req.body.externalLink || book.externalLink;
    book.description = req.body.description || book.description;
    book.summary = req.body.summary || book.summary;
    book.cover = coverUrl;
    book.manuscript = manuscript;

    await book.save({ session });
    await session.commitTransaction();
    session.endSession();
    return next(
      new CustomSuccess(
        { message: "Please give Scribble team up to 48 hours to approve your request", bookId },
        "Book updated successfully",
        200,
      ),
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(CustomError.internal(error.message));
  }
};

