export const postAttachments = ({ localField, returnAs }) => {
  if (!localField) localField = "post.attachments";
  if (!returnAs) returnAs = "attachments";
  return [
    {
      $lookup: {
        from: "media",
        localField: `${localField}`,
        foreignField: "_id",
        as: `${returnAs}`,
      },
    },
    // {
    //   $unwind: {
    //     path: `$${returnAs}`,
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
  ];
};
