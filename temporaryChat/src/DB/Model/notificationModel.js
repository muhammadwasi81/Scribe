import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  {
    timestamps: true,
  },
);

const NotificationModel = mongoose.model("Notification", NotificationSchema);

export default NotificationModel;
