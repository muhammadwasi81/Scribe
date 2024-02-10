import ffmpeg from "fluent-ffmpeg";

import path from "path";

// import { fileURLToPath } from "url";
import { uid } from "uid/secure";
import CustomError from "../../Utils/ResponseHandler/CustomError.js";
import { uploadImagesToS3 } from "./uploadS3.js";
import { config } from "dotenv";
import fs from "fs";

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

config();
const { secretAccessKey, accessKeyId, region } = process.env;
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const generateThumbnail = async (req, res, next) => {
  req.files && req.files.attachments && req.files.attachments.length > 0
    ? req.files.attachments.map(async (file, index) => {
        const mediaType = file.mimetype.split("/")[0];
        if (mediaType === "video") {
          const baseName = uid(16) + path.extname(file.originalname.toLowerCase());
          // const baseName = uid(16) + ".mp4";
          const mediaPath = "./public/uploads/" + baseName;
          const thumbnailName = `${uid(16)}.jpg`;
          const thumbnailUrl = `./public/uploads/thumbnails/${thumbnailName}`;
          console.log("=========", file.path);
          req.files.attachments[index].mediaPath = baseName;
          req.files.attachments[index].thumbnailPath = thumbnailName;
          ffmpeg(file.path)
            .output(mediaPath)
            .size("480x?")
            .on("error", (err) => {
              console.log("Error compressing video:", err);
              return next(
                CustomError.createError(
                  "Something went wrong while compressing video thumbnail",
                  400,
                ),
              );
            })
            .on("end", () => {
              console.log("Compressed video successfully:", mediaPath);
              ffmpeg(mediaPath)
                .seekInput("00:00:01")
                .frames(1)
                .output(thumbnailUrl)
                .on("error", (err) => {
                  console.log("Error while generating thumbnail", err);
                  return next(
                    CustomError.createError(
                      "Something went wrong while compressing video thumbnail",
                      400,
                    ),
                  );
                })
                .on("end", () => {
                  console.log("thumbnail created=>", thumbnailUrl);

                  fs.readFile(mediaPath, (err, data) => {
                    if (err) {
                      return next(
                        CustomError.createError(
                          `Something went wrong while compressing video thumbnail ${err}`,
                          400,
                        ),
                      );
                    }
                    new Upload({
                      client: s3,
                      params: {
                        Bucket: "scribbleapi",
                        Key: "public/uploads/" + baseName,
                        Body: data,
                        ContentType: file.mimetype,
                      },
                      leavePartsOnError: false,
                    })
                      .done()
                      .then((data) => {
                        fs.unlinkSync(mediaPath);
                        fs.unlinkSync(file.path);
                        console.log("File Removed Successfully", mediaPath);
                        console.log("success", data);
                      })
                      .catch((err) => {
                        fs.unlinkSync(mediaPath);
                        fs.unlinkSync(file.path);
                        return next(
                          CustomError.createError(
                            `Something went wrong while compressing video thumbnail ${err}`,
                            400,
                          ),
                        );
                      });
                  });

                  fs.readFile(thumbnailUrl, (err, thumbnail) => {
                    if (err) {
                      return next(
                        CustomError.createError(
                          `Something went wrong while compressing video thumbnail ${err}`,
                          400,
                        ),
                      );
                    }
                    new Upload({
                      client: s3,
                      params: {
                        Bucket: "scribbleapi",
                        Key: "public/uploads/thumbnails/" + thumbnailName,
                        Body: thumbnail,
                        ContentType: "image/png",
                      },
                      leavePartsOnError: false,
                    })
                      .done()
                      .then((data) => {
                        console.log("success", data);
                        fs.unlinkSync(thumbnailUrl);
                        console.log("File Removed Successfully", thumbnailUrl);
                      })
                      .catch((err) => {
                        fs.unlinkSync(thumbnailUrl);
                        return next(
                          CustomError.createError(
                            `Something went wrong while compressing video thumbnail ${err}`,
                            400,
                          ),
                        );
                      });
                  });
                })
                .run();
            })
            .run();
        } else {
          const imageName = `${uid(16)}.jpg`;

          req.files.attachments[index].image = file.path;
          console.log(file.path);
          req.files.attachments[index].mediaPath = imageName;
          if (index === req.files.attachments.length - 1) {
            uploadImagesToS3(req.files.attachments);
          }
        }
      })
    : [];
  next();
};
