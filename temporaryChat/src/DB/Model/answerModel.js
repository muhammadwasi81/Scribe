import { Schema, model } from "mongoose";

const AnswerSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Question",
    },
    answer: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// index for question and user

AnswerSchema.index( { question: 1, user: 1 }, { unique: true } );

// index for user

AnswerSchema.index( { user: 1 } );

export const AnswerModel = model("answer", AnswerSchema);