import { model, Schema } from "mongoose";

const VerificationRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isDeclined: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const VerificationRequestModel = model("VerificationRequest", VerificationRequestSchema);
