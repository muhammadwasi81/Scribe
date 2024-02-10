import { Schema, model } from "mongoose";
const reactionSchema = new Schema(
  {
    reactionOn: {
      type: String,
      enum: ["Post", "Comment"],
      required: true,
    },
    reactionType: {
      type: String,
      enum: ["Like", "Love", "Haha", "Wow", "Sad", "Angry"],
      required: true,
      default: "Like",
    },
    parent: {
      type: Schema.Types.ObjectId,
      refPath: "reactionOn",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
  },
  { timestamps: true },
);
export const ReactionModel = model("Reaction", reactionSchema);
