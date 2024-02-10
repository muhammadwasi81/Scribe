import { Schema, model } from "mongoose";

const librarySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },

    authorName: {
      type: String,
      required: true,
    },
    genre: {
      type: String,
      required: true,
    },
    externalLink: {
      type: String,
      required: false,
      default: "No Link Available",
    },
    summary: {
      type: String,
      required: true,
      default: "No Summary Available",
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    cover: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    manuscript: {
      type: Schema.Types.ObjectId,
      ref: "Media",
    },
    isApproved: {
      type: Schema.Types.Boolean,
      default: false,
    },
   newTitle: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export const LibraryModel = model("library", librarySchema);
