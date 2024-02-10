import { timeElapsed } from "../createdAtCalculator.js";

export class CommentResource {
  constructor(commentDbObject) {
    this.user = {
      id: commentDbObject.user._id,
      userName: commentDbObject.user.userName,
      fullName: commentDbObject.user.fullName,
      image: commentDbObject.user.image
        ? commentDbObject.user.image._doc
          ? commentDbObject.user.image._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
          : commentDbObject.user.image.mediaUrl
          ? commentDbObject.user.image.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
          : "public/uploads/default.png"
        : "public/uploads/default.png",
      isFollowing: commentDbObject.user.isFollowing ? commentDbObject.user.isFollowing : false,
    };
    this.comment = commentDbObject.text;
    this.createdAt = timeElapsed(commentDbObject.createdAt);
    this.updatedAt = timeElapsed(commentDbObject.updatedAt);
    if (Date.parse(commentDbObject.updatedAt) > Date.parse(commentDbObject.createdAt)) {
      this.isEdited = true;
    } else {
      this.isEdited = false;
    }
    this.topReactionTypes = commentDbObject.topReactionTypes;
    this.reactionsCount = commentDbObject.reactionsCount
      ? commentDbObject.reactionsCount
      : commentDbObject.reactions
      ? commentDbObject.reactions.length
      : 0;
    this.isReacted = commentDbObject.isReacted ? !!commentDbObject.isReacted : false;
    this.reactionType = commentDbObject.reactionType ? commentDbObject.reactionType : null;
    // this.isLiked = commentDbObject.isLiked ? commentDbObject.isLiked : false;
    this.id = commentDbObject._id;
    this.repliesCount = commentDbObject.repliesCount
      ? commentDbObject.repliesCount
      : commentDbObject.replies
      ? commentDbObject.replies.length
      : 0;
    this.topReplies = commentDbObject.topReplies
      ? commentDbObject.topReplies.map((reply) => {
          return {
            id: reply._id,
            reply: reply.text,
            user: {
              id: reply.user._id,
              userName: reply.user.userName,
              fullName: reply.user.fullName,
              image: reply.user.image
                ? reply.user.image._doc.mediaUrl
                  ? reply.user.image._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
                  : "public/uploads/default.png"
                : "public/uploads/default.png",
            },
            createdAt: timeElapsed(reply.createdAt),
            reactionsCount: reply.reactionsCount ? reply.reactionsCount : 0,
          };
        })
      : [];
    this.isReply = commentDbObject.isReply ? true : false;
  }
}
