import MediaModel from "../../DB/Model/media.js";
// import { checkUserType } from "./userTypeResource.js";

export const uploadMedia = async (file, mediaType, userType, profile) => {
  if (typeof file === "object") {
    const mediaTypes = ["image", "video"];
    if (!mediaTypes.includes(mediaType)) {
      // unlinkSync(file.path);
      throw new Error("mediaType is not correct");
    }
    const path = file.path;
    try {
      const createdMedia = await new MediaModel({
        mediaUrl: path,
        mediaType,
        userType,
        profile,
      }).save();
      return createdMedia._id;
    } catch (error) {
      // unlinkSync(file?.path);
      throw new Error(error.message);
    }
    // try {
    //   const { userType, userModel } = await checkUserType(profileType, profile);
    // } catch (error) {
    //   throw new Error(error.message);
    // }
    // return `${req.protocol}://${req.get("host")}/api/v1/ecommerce/image/${file.filename}`;
  }
  // unlinkSync(file?.path);
  return false;
};
