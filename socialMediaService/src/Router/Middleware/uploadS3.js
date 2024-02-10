import { config } from "dotenv";
// import CustomError from "../../Utils/ResponseHandler/CustomError.js";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";

config();
const { secretAccessKey, accessKeyId, region } = process.env;
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
export const uploadImagesToS3 = async (images) => {
  images.map((item) => {
    const mediaType = item.mimetype.split("/")[0];
    if (mediaType === "image") {
      const image = fs.readFileSync(item.image);
      new Upload({
        client: s3,
        params: {
          Bucket: "scribbleapi",
          Key: item.image,
          Body: image,
          ContentType: item.mimetype,
        },
        leavePartsOnError: false,
      })
        .done()
        .then((data) => {
          fs.unlinkSync(item.image);
          console.log("success", data);
        })
        .catch((err) => {
          fs.unlinkSync(item.image);
          throw new Error(err.message);
          // return next(
          //   CustomError.createError(
          //     `Something went wrong while compressing video thumbnail ${err}`,
          //     400,
          //   ),
          // );
        });
    }
  });
  return;
};
