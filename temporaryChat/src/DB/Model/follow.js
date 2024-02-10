import { Schema, model } from "mongoose";

const FollowSchema = new Schema(
  {
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps:true,
  },
);

const FollowModel = model("Follow", FollowSchema);

export default FollowModel;
