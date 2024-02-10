const mongoose = require("mongoose");

const requestconfirm = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
exports.UserConfirmRequest = mongoose.model('userconfirmrequest', requestconfirm);
// exports.userconfirmrequest= UserConfirmRequest;