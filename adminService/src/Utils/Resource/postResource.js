import { ReactionModel } from "../../DB/Model/reactionModel.js";
import { timeElapsed } from "../createdAtCalculator.js";

export class PostResource {
  constructor(postDbObject) {
    this.caption = postDbObject.caption;
    this.user = {
      id: postDbObject.user._id,
      userName: postDbObject.user.userName,
      fullName: postDbObject.user.fullName,
      image: postDbObject.user.image
        ? postDbObject.user.image._doc
          ? postDbObject.user.image._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
          : postDbObject.user.image.mediaUrl
          ? postDbObject.user.image.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
          : "public/uploads/default.png"
        : "public/uploads/default.png",
      isFollowing: postDbObject.user.isFollowing ? postDbObject.user.isFollowing : false,
    };
    this.topReactions = postDbObject.topReactionsType;
    this.attachments =
      postDbObject.attachments && postDbObject.attachments.length
        ? postDbObject.attachments.map((attachment) => {
            return {
              thumbnail:
                attachment._doc && (attachment._doc.thumbnailUrl || attachment.thumbnailUrl)
                  ? attachment._doc.thumbnailUrl.replaceAll("\\", "/").replaceAll("./", "")
                  : attachment.thumbnailUrl
                  ? attachment.thumbnailUrl.replaceAll("\\", "/").replaceAll("./", "")
                  : null,
              mediaUrl:
                attachment._doc && attachment._doc.mediaUrl
                  ? attachment._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
                  : attachment.mediaUrl
                  ? attachment.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
                  : null,
              mediaType: attachment._doc
                ? attachment._doc.mediaType
                : attachment.mediaType
                ? attachment.mediaType
                : null,
            };
          })
        : [];
    this.createdAt = timeElapsed(postDbObject.createdAt);
    this.updatedAt = timeElapsed(postDbObject.updatedAt);
    this.isEdited = postDbObject.isEdited ? postDbObject.isEdited : false;
    this.reactionsCount = postDbObject.reactionsCount ? postDbObject.reactionsCount : 0;
    this.commentsCount = postDbObject.commentsCount ? postDbObject.commentsCount : 0;
    // this.isLiked = postDbObject.isLiked ? postDbObject.isLiked : false;
    this.isReacted = !!postDbObject.isReacted;
    this.userReactionType = postDbObject.userReactionType ? postDbObject.userReactionType : null;

    this.topComments = postDbObject.topComments
      ? postDbObject.topComments.length
        ? postDbObject.topComments.map((comment) => {
            return {
              id: comment._id,
              comment: comment.text,
              user: {
                id: comment.user._id,
                userName: comment.user.userName,
                fullName: comment.user.fullName,
                image: comment.user.image
                  ? comment.user.image._doc
                    ? comment.user.image._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
                    : comment.user.image.mediaUrl
                    ? comment.user.image.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
                    : "public/uploads/default.png"
                  : "public/uploads/default.png",
              },
              createdAt: timeElapsed(comment.createdAt),
              isEdited: comment.isEdited ? comment.isEdited : false,
              repliesCount: comment.repliesCount ? comment.repliesCount : 0,
              reactionsCount: comment.reactionsCount ? comment.reactionsCount : 0,
            };
          })
        : []
      : [];
    this.id = postDbObject._id;
    this.isShared = postDbObject.isShared ? postDbObject.isShared : false;
    this.originalPost =
      postDbObject.originalPost && postDbObject.originalPost.user._id
        ? new PostResource(postDbObject.originalPost)
        : null;
  }
  static async calculatePostMeta({ profileId, postDb }) {
    const post = new PostResource(postDb);
    // calculate if post is liked by user
    const followers = postDb.user ? postDb.user.followers : [];

    // console.log(_comment);
    post.user.isFollowing = followers.toString().includes(profileId);
    const userReaction = await ReactionModel.findOne({
      parent: post._id,
      user: profileId,
    });
    post.reactionType = userReaction ? userReaction.reactionType : null;
    post.isReacted = !!userReaction;
    return post;
    // calculate if user is following the post owner
  }
}

// export class SharedPostResource {
//   constructor ( postDbObject )
//   {
//     const post = new PostResource( postDbObject );
//     this = post;

//   }
// }
