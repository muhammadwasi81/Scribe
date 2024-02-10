import mongoose, { Schema } from "mongoose";

const { ObjectId, Date, String } = Schema.Types;
export const UserSchema = new Schema(
  {
    auth: {
      type: ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    image: {
      type: ObjectId,
      ref: "Media",
    },
    gender: {
      type: String,
      enum: ["", "male", "female"],
      lowercase: true,
      trim: true,
      default: "",
    },
    mobile: {
      type: String,
      match: /^(1\s?)?(\d{3}|\(\d{3}\))[\s-]?\d{3}[\s-]?\d{4}$/,
      required: false,
    },
    address: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
    },
    reviews: [
      {
        type: ObjectId,
        ref: "Review",
      },
    ],
    posts: [
      {
        type: ObjectId,
        ref: "Post",
      },
    ],
    comments: [
      {
        type: ObjectId,
        ref: "Comment",
      },
    ],
    reactions: [
      {
        type: ObjectId,
        ref: "Reaction",
      },
    ],
    following: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    hiddenPosts: [
      {
        type: ObjectId,
        ref: "Post",
      },
    ],
    blockedUsers: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);
UserSchema.virtual("followingCount", {
  ref: "User",
  localField: "following",
  foreignField: "_id",
  count: true,
});

// Add virtual field for follower length
UserSchema.virtual("followerCount", {
  ref: "User",
  localField: "followers",
  foreignField: "_id",
  count: true,
});
UserSchema.index({ userName: 1 }, { unique: true });
UserSchema.index({ userName: "text" });
const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
