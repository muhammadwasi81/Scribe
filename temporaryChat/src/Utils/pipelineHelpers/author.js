export const author = ({ localField, foreignField, returnAs, profileId }) => {
  if (!localField) localField = "user";
  if (!foreignField) foreignField = "_id";
  if (!returnAs) returnAs = "user";
  const pipeline = [
    {
      $lookup: {
        from: "users",
        localField: `${localField}`,
        foreignField: `${foreignField}`,
        as: `${returnAs}`,
      },
    },
    { $unwind: { path: `$${returnAs}`, preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "media",
        localField: `${localField}.image`,
        foreignField: "_id",
        as: `${returnAs}.image`,
      },
    },
    { $unwind: { path: `$${returnAs}.image`, preserveNullAndEmptyArrays: true } },
  ];
  if (profileId) {
    pipeline.push({
      $addFields: {
        [`${returnAs}.isFollowing`]: {
          $ifNull: [
            {
              $setIsSubset: [
                [profileId],
                {
                  $map: {
                    input: { $ifNull: [`$${returnAs}.followers`, []] },
                    in: { $toString: "$$this" },
                  },
                },
              ],
            },
            false,
          ],
        },
      },
    });
  }
  return pipeline;
};
