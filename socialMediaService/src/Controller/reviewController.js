import { ReviewModel } from "../DB/Model/reviewModel.js";
import { LibraryModel } from "../DB/Model/libraryModel.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";

export const createReview = async (req, res, next) => {
  try {
    const { bookId, rating, description } = req.body;

    // Validate input
    if (!bookId) {
      throw new CustomError("Please provide a book ID", 400);
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new CustomError("Please provide a valid rating between 1 and 5", 400);
    }
    if (!description) {
      throw new CustomError("Please provide a description", 400);
    }

    // Check if book exists and is approved
    const book = await LibraryModel.findOne({ _id: bookId, isApproved: true }).lean();
    if (!book) {
      throw new CustomError("Book not found or is not approved", 404);
    }
    const existingReview = await ReviewModel.findOne({
      book: bookId,
      user: req.profileId,
    }).lean();
    if (existingReview) {
      throw new CustomError("You have already reviewed this book", 400);
    }

    // Create review object
    const review = new ReviewModel({
      book: bookId,
      rating,
      description,
      user: req.profileId,
    });
    await review.save();

    return next(
      CustomSuccess.createSuccess(
        {
          message: "Please give scribble team upto 48 hours to review your request",
          reviewId: review._id,
        },
        "Review created successfully",
        201,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const approveReviewById = async (req, res, next) => {
  const { reviewId } = req.params;

  try {
    const review = await ReviewModel.findById(reviewId).lean();

    if (!review) {
      throw new CustomError("Review not found", 404);
    }

    review.isApproved = true;

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

export const getReviewsByBookId = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const reviews = await ReviewModel.find({ book: bookId, isApproved: true })
      .populate({
        path: "user",
        select: "fullName userName image",
        populate: { path: "image", select: "mediaUrl" },
      })
      .lean({ virtuals: true });
    if (!reviews) {
      throw new CustomError("No reviews found for this book", 404);
    }
    return next(CustomSuccess.createSuccess({ reviews }, "Reviews fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
