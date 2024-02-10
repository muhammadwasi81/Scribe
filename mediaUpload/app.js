import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import express from "express";
import multer from "multer";
import { config } from "dotenv";

// Create an instance of Express.js
const app = express();
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
// Define the storage location and file naming strategy
const storage = multerS3({
  s3: s3,
  bucket: "scribbleapi",
  key: function (req, file, callback) {
    file.path = "public/uploads/" + file.originalname;
    file.destination = "public/uploads/";
    file.name = file.originalname;
    callback(null, file.path);
  },
});

// Create an instance of Multer middleware using the storage configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 5,
  },
  fileFilter: (req, file, callback) => {
    console.log(" inside uploads");
    return callback(null, true);
  },
});
const thumbnailStorage = multerS3({
  s3: s3,
  bucket: "scribbleapi",
  key: (req, file, callback) => {
    file.path = "public/uploads/thumbnails/" + file.originalname;
    file.destination = "public/uploads/thumbnails/";
    file.name = file.originalname;
    callback(null, file.path);
  },
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, callback) => {
    return callback(null, true);
  },
});

const libraryStorage = multerS3({
  s3: s3,
  bucket: "scribbleapi",
  key: (req, file, callback) => {
    file.path = "public/uploads/library/" + file.originalname;
    file.destination = "public/uploads/library/";
    file.name = file.originalname;
    callback(null, file.path);
  },
});
const uploadLibrary = multer({
  storage: libraryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 5,
  },
  fileFilter: (req, file, callback) => {
    return callback(null, true);
  },
});
// Define a route for file uploads

app.post("/uploadProfilePic", upload.single("image"), (req, res) => {
  console.log(req.file);
  return res.send("File uploaded successfully");
});

app.post(
  "/upload",
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  (req, res) => {
    console.log(req.files);
    return res.send("File uploaded successfully");
  }
);
app.post("/multipleUpload", upload.array("media", 15), (req, res) => {
  console.log(req.files);
  res.send("Files uploaded successfully");
});
app.post(
  "/upload_thumbnail",
  thumbnailUpload.array("thumbnails", 15),
  (req, res) => {}
);
app.post("/library", uploadLibrary.single("media"), (req, res) => {
  res.status(201).send("File uploaded successfully");
});
app.listen(3310, () => {
  console.log("Server started on port 3310");
});