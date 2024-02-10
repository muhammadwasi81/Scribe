import mongoose from "mongoose";
import { AnswerModel } from "../DB/Model/answerModel.js";
import AuthModel from "../DB/Model/authModel.js";
import NotificationModel from "../DB/Model/notificationModel.js";
import { QuestionModel } from "../DB/Model/questionModel.js";
import UserModel from "../DB/Model/userModel.js";
import { sendNotification } from "../Utils/Notifications.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";

export const createAnswer = async (req, res, next) => {
  try {
    const { questionId, answer } = req.body;

    // Check if the question exists
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      throw new CustomError("Question not found", 404);
    }
    // check if the user has already answered the question
    const existingAnswer = await AnswerModel.findOne({
      question: questionId,
      user: req.profileId,
    }).lean();

    if (existingAnswer) {
      throw new CustomError("You have already answered this question", 400);
    }
    // Create the answer
    const newAnswer = new AnswerModel({
      question: questionId,
      answer,
      user: req.profileId,
    });
    const _answer = await newAnswer.save().then((data) => {
      return data.populate([
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
      ]);
    });

    // Update the answers array in the question
    question.answers.push(newAnswer);

    const _user = await UserModel.findById(question.createdBy)
      .populate([
        {
          path: "auth",
          model: AuthModel,
          select: "devices",
          populate: [
            {
              path: "devices",
              select: ["deviceToken", "deviceSetting"],
              populate: {
                path: "deviceSetting",
                match: { notificationOn: true },
              },
            },
          ],
        },
      ])
      .lean();
    const AuthUser = await UserModel.findById(req.profileId);
    console.log(AuthUser, "AuthUser************************")
    const { _id, devices } = _user.auth;
    await new NotificationModel({
      auth: _id,
      title: `${AuthUser.fullName} answered your question`,
      body: `Tap to view the answer`,
      payload: {
        type: "answer",
        questionId: question._id,
      },
    }).save();
    if (devices.length > 0) {
      // const promises = devices.map(async (device) => {
      //   sendNotification(
      //     device.deviceToken,
      //     `${req.user.fullName} answered your question`,
      //     `Tap to view the answer`,
      //   );
      //   return true;
      // });
      // await Promise.all(promises);
    }
    await question.save();
    const user = _answer.user;

    const image = _answer.user.image ? _answer.user.image.mediaUrl : "public/images/default.png";
    delete _answer.user;
    delete _answer._doc.user;
    return next(
      CustomSuccess.createSuccess(
        { user: { ...user._doc, image }, ..._answer._doc },
        "Answer created successfully",
        201,
      ),
    );
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const updateAnswerById = async (req, res, next) => {
  const { answer, id } = req.body;
  const { profileId } = req;
  if (!id || !answer) return next(CustomError.badRequest("Invalid request"));
  try {
    const _answer = await AnswerModel.findOneAndUpdate(
      {
        _id: id,
        user: profileId,
      },
      {
        answer,
      },
      {
        new: true,
      },
    )
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

    if (!_answer) return next(CustomError.notFound("Answer not found"));
    _answer.user.image = _answer.user.image
      ? _answer.user.image.mediaUrl
      : "public/images/default.png";
    return next(CustomSuccess.createSuccess(_answer, "Answer updated successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

export const deleteAnswerById = async (req, res, next) => {
  const { id } = req.params;
  const { profileId } = req;
  if (!id) return next(CustomError.badRequest("Invalid request"));
  try {
    const answer = await AnswerModel.findOneAndDelete({
      _id: id,
      user: profileId,
    });
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
