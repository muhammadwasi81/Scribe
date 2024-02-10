import { Schema, model } from "mongoose";

const MediaSchema = new Schema(
  {
    mediaType: {
      type: Schema.Types.String,
      enum: ["image", "video"],
      required: true,
    },
    mediaUrl: {
      type: Schema.Types.String,
      required: true,
    },
    userType: {
      type: Schema.Types.String,
      enum: ["Admin", "User", "CSR"],
      required: true,
    },
    profile: {
      type: Schema.Types.ObjectId,
      refPath: "userType",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const MediaModel = model("Media", MediaSchema);

export default MediaModel;
