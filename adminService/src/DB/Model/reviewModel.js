import { Schema, model } from "mongoose";
import { mongooseLeanVirtuals } from "mongoose-lean-virtuals";

const ReviewSchema = new Schema(
  {
    book: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "library",
    },
    rating: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    isApproved: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isRejected: {
    type: Schema.Types.Boolean,
    default: false,
    },
  },
  { timestamps: true },
);

ReviewSchema.plugin(mongooseLeanVirtuals);

export const ReviewModel = model("review", ReviewSchema);
