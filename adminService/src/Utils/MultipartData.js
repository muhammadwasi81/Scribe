import multer from "multer";
import axios from "axios";
import { config } from "dotenv";
import path from "path";
import CustomError from "./ResponseHandler/CustomError.js";
import { uid } from "uid/secure";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

config();
const { secretAccessKey, accessKeyId, region } = process.env;

//
export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const uploadToService = (_allowedFileTypes, type) => {
  const allowedFileTypes = _allowedFileTypes || ["image/", "video/", "audio/"];
  // convert allowedFileTypes to regex
  const allowedFileTypesRegex = new RegExp(allowedFileTypes.join("|"));
  const serviceUrl = process.env.SERVICE_URL;
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      return cb(null, "public/uploads");
    },
    filename: (req, file, cb) => {
      const fileName = file.originalname.split(" ").join("-");
      const extension = path.extname(fileName);
      const baseName = path.basename(fileName, extension);
      return cb(null, baseName + "-" + Date.now() + extension);
    },
  });

  const fileFilter = (req, file, cb) => {
    // Check file type and reject non-image files
    if (!allowedFileTypesRegex.test(file.mimetype)) {
      return cb(new Error("File type not supported"), false);
    }

    cb(null, true);
  };

  const upload = multer({ storage, fileFilter });

  return (req, res, next) => {
    if (!serviceUrl) return next(CustomError.createError("Service url not found", 500));
    if (!req.file) {
      return next();
    }
    upload[type]("file")(req, res, (err) => {
      if (err) {
        return next(err);
      }
      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const contentType = req.file.mimetype;

      const options = {
        method: "post",
        url: serviceUrl,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
        data: fileBuffer,
      };

      axios(options)
        .then(() => {
          return next();
        })
        .catch((error) => {
          console.log("error in file upload => ", error);
          return next(CustomError.createError(error.message, 500));
        });
    });
  };
};
export const uploadSingleImage = multer({
  dest: "public/uploads/",

  storage: multerS3({
    s3: s3,
    bucket: "scribbleapi",
    key: function (req, file, callback) {
      const extension = path.extname(file.originalname);
      const headerFileName = req.headers["fileName"];
      const fileName = headerFileName ? headerFileName : uid(16) + extension;

      file.path = "public/uploads/" + fileName;
      file.destination = "public/uploads/";
      file.filename = fileName;
      callback(null, file.path);
    },
  }),
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, callback) => {
    const FileTypes = /jpeg|jpg|png|gif/;
    const mimType = FileTypes.test(file.mimetype);
    const extname = FileTypes.test(path.extname(file.originalname));
    if (mimType && extname) {
      return callback(null, true);
    }
    return callback(new Error("File type not supported"), false);
  },
});
