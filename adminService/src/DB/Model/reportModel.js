import { model, Schema } from "mongoose";

const reportSchema = new Schema({
  reporter: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reason: {
    type: String,
    default: "",
  },
  additionalInfo: {
    type: String,
    default: "",
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
});

export const reportModel = model("Report", reportSchema);
