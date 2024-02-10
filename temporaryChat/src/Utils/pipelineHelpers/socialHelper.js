import mongoose from "mongoose";
import { author } from "./author.js";
// import { postAttachments } from "./postAttachments.js";

export const postLookup = ({ localField, foreignField, returnAs, profileId }) => {
  if (!localField) localField = "post";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "post";
  const pipeline = [
    {
      $lookup: {
        from: "posts",
        localField: `${localField}`,
        foreignField: `${foreignField}`,
        as: `${returnAs}`,
      },
    },
    // unwind originalPost array
    { $unwind: { path: `$${returnAs}`, preserveNullAndEmptyArrays: true } },
    ...author({ localField: `${localField}.user`, returnAs: `${returnAs}` }),
    {
      $unwind: { path: `$${returnAs}.user`, preserveNullAndEmptyArrays: false },
    },
    // ...onlyPostContent({ localField, foreignField, returnAs }),
    // ...postAttachments({ localField: `${returnAs}.attachments`, returnAs: `${returnAs}` }),
    // ...reactions({ localField: `${returnAs}.reactions`, returnAs: `${returnAs}` }),
  ];
  if (profileId) {
    pipeline.push({
      $addFields: {
        [`${returnAs}.isReacted`]: { $in: [profileId, "$" + `${returnAs}.reactions.user`] },
      },
    });
  }
  return pipeline;
};
export const onlyPostContent = ({ localField, foreignField, returnAs }) => {
  if (!localField) localField = "post";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "post";
  return [
    {
      $lookup: {
        from: "posts",
        localField: `${localField}`,
        foreignField: `${foreignField}`,
        as: `${returnAs}`,
      },
    },
    {
      $unwind: {
        path: `$${returnAs}`,
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
};
export const reactions = ({ localField, foreignField, returnAs, profileId }) => {
  if (!localField) localField = "post.reactions";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "reactions";

  const query = [
    {
      $lookup: {
        from: "reactions",
        localField: `${localField}`,
        foreignField: "parent",
        as: `${returnAs}`,
      },
    },
    // search top reaction Types
    // {
    //   $unwind: {
    //     path: `$${returnAs}`,
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
  ];
  if (profileId) {
    query.push(
      {
        $lookup: {
          from: "reactions",
          let: { postId: "$_id", userId: mongoose.Types.ObjectId(profileId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$parent", "$$postId"] }, { $eq: ["$user", "$$userId"] }],
                },
              },
            },
            {
              $project: {
                reactionType: 1,
                _id: 0,
              },
            },
          ],
          as: "userReaction",
        },
      },
      {
        $addFields: {
          isReacted: { $gt: [{ $size: "$userReaction" }, 0] },
          userReactionType: { $arrayElemAt: ["$userReaction.reactionType", 0] },
        },
      },
    );
  }
  return query;
};
export const replies = ({ localField, foreignField, returnAs }) => {
  if (!localField) localField = "comment.replies";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "replies";
  return [
    // same as comments but with different localField and foreignField
    {
      $lookup: {
        from: "comments",
        localField: `${localField}`,
        foreignField: `${foreignField}`,
        as: `${returnAs}.replies`,
      },
    },
    ...author({ localField: `${returnAs}.replies.user`, returnAs: `${returnAs}.replies` }),
    ...reactions({ localField: `${returnAs}.replies.reactions`, returnAs: `${returnAs}.replies` }),
  ];
};
export const comments = ({ localField, foreignField, returnAs }) => {
  if (!localField) localField = "post.comments";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "comments";
  return [
    {
      $lookup: {
        from: "comments",
        localField: `${localField}`,
        foreignField: `${foreignField}`,
        as: `${returnAs}.comments`,
      },
    },
    ...author({ localField: `${returnAs}.comments.user`, returnAs: `${returnAs}.comments` }),

    ...reactions({
      localField: `${returnAs}.comments.reactions`,
      returnAs: `${returnAs}.comments`,
    }),
    ...replies({ localField: `${returnAs}.comments.replies`, returnAs: `${returnAs}.comments` }),
  ];
};
export const additionalMetaFields = ({ reactions, comments }) => {
  if (!reactions) reactions = "reactions";
  if (!comments) comments = "comments";
  return [
    // {
    //   $addFields: {
    //     [`${returnAs}.isCommented`]: { $gt: [ { $size: "$" + `${returnAs}.comments` }, 0 ] },
    //     [`${returnAs}.isReplied`]: { $gt: [ { $size: "$" + `${returnAs}.replies` }, 0 ] },
    //     [`${returnAs}.isReacted`]: { $gt: [ { $size: "$" + `${returnAs}.reactions` }, 0 ] },
    //   },
    // },
    {
      $addFields: {
        popularity: {
          $add: [
            {
              $size: `$${reactions}`,
            },
            {
              $size: `$${comments}`,
            },
          ],
        },
        reactionsCount: {
          $size: `$${reactions}`,
        },
        commentsCount: {
          $size: `$${comments}`,
        },
        topReactionsType: {
          $let: {
            vars: {
              sortedReactions: {
                $map: {
                  input: {
                    $setUnion: `$${reactions}.reactionType`,
                  },
                  in: {
                    type: "$$this",
                    count: {
                      $size: {
                        $filter: {
                          input: `$${reactions}`,
                          cond: {
                            $eq: ["$$this", "$$this.type"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            in: {
              $map: {
                input: { $slice: ["$$sortedReactions", 0, 3] },
                in: "$$this.type",
              },
            },
          },
        },
      },
    },
  ];
};

export const topReactionsType = ({ localField }) => {
  if (!localField) localField = "reactions";

  return [
    {
      topReactionsType: {
        $let: {
          vars: {
            sortedReactions: {
              $map: {
                input: {
                  $setUnion: `$${localField}.reactionType`,
                },
                in: {
                  type: "$$this",
                  count: {
                    $size: {
                      $filter: {
                        input: `$${localField}`,
                        cond: {
                          $eq: ["$$this", "$$this.type"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          in: {
            $map: {
              input: { $slice: ["$$sortedReactions", 0, 3] },
              in: "$$this.type",
            },
          },
        },
      },
    },
  ];
};
