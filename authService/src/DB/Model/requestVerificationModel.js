import mongoose from "mongoose";

const requestVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

const requestVerificationModel = mongoose.model("requestVerification", requestVerificationSchema);

export default requestVerificationModel;
