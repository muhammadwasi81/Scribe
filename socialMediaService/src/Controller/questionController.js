import mongoose from "mongoose";
import { QuestionModel } from "../DB/Model/questionModel.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";

export const createQuestion = async (req, res, next) => {
  try {
    const { question, isAnonymous } = req.body;

    // Validate input
    if (!question) {
      throw new CustomError("Please provide a question", 400);
    }

    // Create question object
    const newQuestion = new QuestionModel({
      question,
      createdBy: req.profileId,
      isAnonymous,
    });
    await newQuestion.save();

    return next(
      CustomSuccess.createSuccess(
        { questionId: newQuestion._id },
        "Question created successfully",
        201,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const updateQuestionById = async (req, res, next) => {
  const { questionId } = req.params;
  const { question, isAnonymous } = req.body;
  const { profileId } = req;
  if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
    return next(CustomError.badRequest("Invalid question ID"));
  }
  if (!question && !isAnonymous) {
    return next(CustomError.badRequest("Please provide changes"));
  }
  try {
    let changes = {};
    if (question) changes.question = question;
    if (isAnonymous) changes.isAnonymous = isAnonymous;
    const updatedQuestion = await QuestionModel.findOneAndUpdate(
      { _id: questionId, createdBy: profileId },
      changes,
      { new: true },
    ).lean();
    if (!updatedQuestion) {
      return next(CustomError.notFound("Question not found"));
    }
    return next(new CustomSuccess(updatedQuestion, "Question updated successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const deleteQuestionById = async (req, res, next) => {
  const { questionId } = req.params;
  const { profileId } = req;
  if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
    return next(CustomError.badRequest("Invalid question ID"));
  }
  try {
    const deletedQuestion = await QuestionModel.findOneAndDelete({
      _id: questionId,
      createdBy: profileId,
    }).lean();
    if (!deletedQuestion) {
      return next(CustomError.notFound("Question not found"));
    }
    return next(new CustomSuccess(deletedQuestion, "Question deleted successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// export const getQuestions = async (req, res, next) => {
//   try {
//     let questions = await QuestionModel.find()
//       .populate({
//         path: "createdBy",
//         select: ["fullName", "userName", "image"],
//         populate: {
//           path: "image",
//           select: "mediaUrl",
//         },
//       })
//       .lean();

//     if (!questions.length) {
//       return next(CustomError.notFound("No questions found"));
//     }
//     questions.forEach((question) => {
//       if (
//         question.createdBy &&
//         typeof question.createdBy === "object" &&
//         typeof question.createdBy.image === "object" &&
//         question.createdBy.image !== null
//       ) {
//         question.createdBy.image = question.createdBy.image.mediaUrl;
//       }
//       if (
//         question.createdBy &&
//         typeof question.createdBy === "object" &&
//         question.createdBy.image === null
//       ) {
//         question.createdBy.image = "public/images/default.png";
//       }
//     });
//     return next(new CustomSuccess(questions, "Questions fetched successfully", 200));
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };

// export const getQuestions = async (req, res, next) => {
//   console.log("function triggered")
//   try {
//     let questions = await QuestionModel.find()
//       .populate({
//         path: "createdBy",
//         select: ["fullName", "userName", "image"],
//         populate: {
//           path: "image",
//           select: "mediaUrl",
//         },
//       })
//       .lean();
//      console.log("questions->", questions)
//     if (!questions.length) {
//       return next(CustomError.notFound("No questions found"));
//     }

//     questions.forEach((question) => {
//      if (question.createdBy == null || typeof question.createdBy !== "object") {
//     return;
//   }

//       if (question.createdBy && question.createdBy.image && typeof question.createdBy.image === "object") {
//         question.createdBy.image = question.createdBy.image.mediaUrl;
//       } else {

//         question.createdBy.image = "public/images/default.png";
//       }
//     });

//     return next(new CustomSuccess(questions, "Questions fetched successfully", 200));
//   } catch (error) {
//     return next(CustomError.internal(error.message));
//   }
// };

export const getQuestions = async (req, res, next) => {
  console.log("function triggered");
  try {
    let questions = await QuestionModel.find()
      .populate({
        path: "createdBy",
        select: ["fullName", "userName", "image"],
        populate: {
          path: "image",
          select: "mediaUrl",
        },
      })
      .lean();
    console.log("questions->", questions);
    if (!questions.length) {
      return next(CustomError.notFound("No questions found"));
    }

    questions.forEach((question) => {
      // Check if createdBy exists and is an object
      if (!question.createdBy || typeof question.createdBy !== "object") {
        // Assign default values if createdBy is null or not an object
        question.createdBy = {
          _id: new mongoose.Types.ObjectId(),
          fullName: "Unknown User",
          userName: "unknownUser",
          image: "public/images/default.png",
        };
      } else {
        // If createdBy is valid but the image is missing or not an object
        question.createdBy.image =
          question.createdBy.image && typeof question.createdBy.image === "object"
            ? question.createdBy.image.mediaUrl
            : "public/images/default.png";
      }
    });

    return next(new CustomSuccess(questions, "Questions fetched successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
