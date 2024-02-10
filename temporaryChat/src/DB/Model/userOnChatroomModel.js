import { Schema, model } from "mongoose";
import UserModel from "./userModel.js";

const UserOnChatroomSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    model: UserModel,
  },
  chatrooms: [
    {
      type: Schema.Types.ObjectId,
      ref: "Chatroom",
    },
  ],
});
UserOnChatroomSchema.index({ user: 1 }, { unique: true });

export const UserOnChatroomModel = model("UserOnChatroom", UserOnChatroomSchema);
