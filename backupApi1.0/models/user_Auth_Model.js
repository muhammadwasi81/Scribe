const mongoose = require("mongoose");

const usersschema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  userFullName: {
    type: String,
    required: true,
  },

  userNick: {
    type: String,
  },
  userEmail: {
    type: String,
    required: true,
    unique: true,
  },
  userPassword: {
    type: String,
    required: true,
  },
  userBio: {
    type: String,
  },
  userImage: {
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  },
  userDescribe: {
    type: String,
    required: true,
  },
  userlikes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
  userfollowers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
  userfollowing: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
  userPost: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userpost",
    },
  ],
  userSubscription: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
  ],
  userComment: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "usercomment",
    },
  ],
  userCreatedOn: {
    type: Date,
    default: Date.now,
  },
  userNotificationToken: {
    type: String,
    default: "",
  },
  userLastOnline: {
    type: String,
    default: "",
  },
  userVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: Number,
    default: 0

  },
  userLoginVerified: {
    type: Boolean,
    default: false,
  },
  usershowEmail: {
    type: Boolean,
    default: false,
  },
  userDeviceType: {
    type: Number,
    // required: true,
    // 0) Android 1) iOS
  },
  isNotification: {
    type: Boolean,
    default: true,
  },
});

usersschema.virtual("id").get(function () {
  return this._id.toHexString();
});

usersschema.set("toJSON", {
  virtuals: true,
});
exports.Users = mongoose.model("users", usersschema);
exports.usersschema = usersschema;
