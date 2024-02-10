import { Schema, model } from "mongoose";

const QuestionSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    answers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Answer",
      },
    ],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// index for user
QuestionSchema.index({ createdBy: 1 });

export const QuestionModel = model("Question", QuestionSchema);
