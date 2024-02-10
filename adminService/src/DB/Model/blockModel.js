import { Schema, model } from "mongoose";

const blockedUserSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);
export const blockedUserModel = model("BlockedUser", blockedUserSchema);
