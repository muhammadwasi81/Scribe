import { model, Schema } from "mongoose";

const reportedPostModel = new Schema(
  {
    reports: [ {
      type: Schema.Types.ObjectId,
      ref: "Report",
    }],
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
  },
  {
    timestamps: true,
  },
);

export const ReportedPostModel = model("ReportedPost", reportedPostModel);
