import { Schema, model } from "mongoose";
import { mongooseLeanVirtuals } from "mongoose-lean-virtuals";
const CommentSchema = new Schema(
  {
    commentType: {
      type: String,
      enum: ["Post", "Comment"],
    },
    parent: {
      type: Schema.Types.ObjectId,
      refPath: "commentType",
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Reaction",
      },
    ],
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
    text: {
      type: Schema.Types.String,
    },
    isReply: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isEdited: {
      type: Schema.Types.Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
CommentSchema.plugin(mongooseLeanVirtuals);
CommentSchema.virtual("reactionsCount").get(function () {
  return this.reactions.length;
});
CommentSchema.virtual("repliesCount").get(function () {
  return this.replies.length;
});
CommentSchema.virtual("topReply").get(function () {
  if (this.replies.length > 0) {
    return this.replies.reduce((prev, current) =>
      prev.reactions.length > current.reactions.length ? prev : current,
    );
  }
  return null;
});

CommentSchema.virtual("mutualReactions").get(function () {
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

CommentSchema.virtual("topReactionTypes").get(function () {
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
export const CommentModel = model("Comment", CommentSchema);
