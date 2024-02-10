import { Schema, model } from "mongoose";
import MediaModel from "./media.js";
import { PostModel } from "./postModel.js";

import UserModel from "./userModel.js";

const MessageSchema = new Schema(
  {
    chatroom: {
      type: Schema.Types.ObjectId,
      ref: "Chatroom",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      model: UserModel,
      required: true,
    },
    text: {
      type: String,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Media",
        model: MediaModel,
      },
    ],
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      model: PostModel,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
MessageSchema.index({ chatroom: 1, sender: 1, receiver: 1 });
MessageSchema.index({ chatroom: 1 });
export const MessageModel = model("Message", MessageSchema);
