import { Schema, model } from "mongoose";
import { mongooseLeanVirtuals } from "mongoose-lean-virtuals";
import { CommentModel } from "./commentModel.js";
import UserModel from "./userModel.js";

const PostSchema = new Schema(
  {
    caption: {
      type: String,
    },
    user: {
      type: Schema.Types.ObjectId,
      refPath: "User",
      require: true,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    viewedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        require: true,
      },
    ],
    reactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Reaction",
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    isShared: {
      type: Boolean,
      default: false,
    },
    originalPost: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    sharedPosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    shares: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
PostSchema.plugin(mongooseLeanVirtuals);
PostSchema.virtual("commentsCount").get(function () {
  return this.comments.length;
});
PostSchema.virtual("reactionsCount").get(function () {
  return this.reactions.length;
});
PostSchema.virtual("topComment").get(function () {
  if (this.comments.length > 0) {
    return this.comments.reduce((prev, current) => {
      if (prev && prev.reactions)
        if (current && current.reactions)
          return prev.reactions.length > current.reactions.length ? prev : current;
      return prev;
    });
  }
  return null;
});

PostSchema.virtual("mutualReactions").get(function () {
  let mutualReactions = {};
  this.reactions.forEach((reaction) => {
    if (reaction.user in mutualReactions) {
      mutualReactions[reaction.user]++;
    } else {
      mutualReactions[reaction.user] = 1;
    }
  });
  return mutualReactions;
});
PostSchema.virtual("topComments").get(async function () {
  const comments = await CommentModel.find({ parent: this._id })
    .populate({
      path: "reactions",
      select: "user",
    })
    .populate({
      path: "user",
      model: UserModel,
      populate: {
        path: "image",
      },
    })
    .lean();
  comments.sort((a, b) => b.reactions.length - a.reactions.length);

  return comments.slice(0, 10);
});
PostSchema.virtual("topReactionTypes").get(function () {
  let reactionTypes = {};
  this.reactions.forEach((reaction) => {
    if (reaction.reactionType in reactionTypes) {
      reactionTypes[reaction.reactionType]++;
    } else {
      reactionTypes[reaction.reactionType] = 1;
    }
  });
  return Object.entries(reactionTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
});

export const PostModel = model("Post", PostSchema);
