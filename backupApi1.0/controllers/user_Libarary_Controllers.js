const { UserLibaray } = require("../models/user_Library_Model");
const express = require("express");
const router = express.Router();
const { Users } = require("../models/user_Auth_Model");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");
const genThumbnail = require("simple-thumbnail");
// const mt = require('media-thumbnail')
const mt = require("media-thumbnail");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "video/mp3": "mp3",
  "video/mp4": "mp4",
  "video/mov": "mov",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    console.log(file.mimetype);
    let uploadError = new Error("invalid image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});
const uploadOptions = multer({ storage: storage });

router.post(
  "/createlibrary",
  uploadOptions.single("bookImage"),
  async (req, res) => {
    const file = req.file;
    // thumbnail start
    let fileName = req.file?.filename;

    const filePath = req.file?.destination;
    let thumbnailAddress;
    if (fileName) {
      async function download(req) {
        console.log("1 ==>" + JSON.stringify(req.file));

        // console.log("2 ==>" + fileName);
        // console.log(req.file.destination+fileName)
        const result = await genThumbnail(
          req.file?.path,
          req.file?.destination + "/" + fileName,
          "720x?",
          {
            path: ffmpeg.path,
          }
        );

        console.log("Done!");
        return req.file?.destination + fileName;
      }
      fileName = fileName.replaceAll("mp4", "jpeg");
      thumbnailAddress = await download(req);
    }
    let createlibrary = new UserLibaray({
      booktitle: req.body.booktitle,
      bookdescription: req.body.bookdescription,
      thumbnail: `/public/uploads/${fileName}`.replace("./", "/"),
      authername: req.body.authername,
      userid: req.body.userid,
      genre: req.body.genre,
      externalLink: req.body.externalLink,
      bookImage: file != null ? `/public/uploads/${file.filename}` : "",
    });
    createlibrary = await createlibrary.save();
    if (!createlibrary) {
      return res.status(200).json({
        success: false,
        message: "false",
      });
    }
    res.status(200).json({
      success: true,
      message: "user library create",
      data: createlibrary,
    });
  }
);

//get library

router.get("/getlibrary", async (req, res) => {
  let getlibrary = await UserLibaray.find().populate([
    {
      path: "rating",
      populate: {
        path: "userid",
        model: "users",
      },
    },
  ]);

  // console.log(getlibrary);

  if (!getlibrary) {
    return res.status(200).json({
      success: false,
      message: "library not found",
    });
  }
  res.status(200).json({
    success: true,
    message: "library found",
    data: getlibrary,
  });
});

router.post("/createreview/:id", async (req, res) => {
  let postreview = await UserLibaray.findByIdAndUpdate(req.params.id, {
    $push: {
      rating: {
        rating: req.body.rating,
        ratingdescription: req.body.ratingdescription,
        userid: req.body.userid,
      },
    },
  });
  if (!postreview) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }
  res.status(200).json({
    success: true,
    message: "update comment on post",
    data: postreview,
  });
});

router.post("/approveReview/:id/:ind", async (req, res) => {
  console.log(req.params.id);
  console.log(req.params.ind);

  let approve = await UserLibaray.findById(req.params.id).then(async (val) => {
    val.rating[req.params.ind].approved = 1;

    const ee = await val.save();
    if (!ee) {
      return res.status(200).json({
        success: false,
        message: "update comment not post",
      });
    }
    res.status(200).json({
      success: true,
      message: "update comment on post",
      data: ee,
    });
  });

  // if (!approve) {
  //     return res.status(200).json({
  //         success: false,
  //         message: "update comment not post",
  //     })
  // }
  // res.status(200).json({
  //     success: true,
  //     message: 'update comment on post',
  //     data: approve
  // })
});

module.exports = router;
