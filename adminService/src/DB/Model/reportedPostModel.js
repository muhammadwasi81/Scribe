import { model, Schema } from "mongoose";

const reportedPostModel = new Schema(
  {
    reports: [
      {
        type: Schema.Types.ObjectId,
        ref: "Report",
      },
    ],
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const ReportedPostModel = model("ReportedPost", reportedPostModel);
