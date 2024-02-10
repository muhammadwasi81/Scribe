import { Schema, model } from "mongoose";
import UserModel from "./userModel.js";

const ChatroomSchema = new Schema(
  {
    name: {
      type: String,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        model: UserModel,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  },
);
ChatroomSchema.index({ users: 1 });
ChatroomSchema.index({ lastMessage: 1 }, { unique: true });
export const ChatroomModel = model("Chatroom", ChatroomSchema);
