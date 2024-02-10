import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
    title: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    payload: {
      type: Object,
      default: {},
    },
    link: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
   genericId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const NotificationModel = mongoose.model("Notification", NotificationSchema);

export default NotificationModel;
