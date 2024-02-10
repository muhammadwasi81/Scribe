const { UserPost } = require("../models/user_Post_Model");
const { Users } = require("../models/user_Auth_Model");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const { UserNotification } = require("../models/user_Notification_Model");
const { push_notifications } = require("../config/pushnotification");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");
const genThumbnail = require("simple-thumbnail");
// const mt = require('media-thumbnail')
const mt = require("media-thumbnail");

// const FILE_TYPE_MAP = {
//     'image/png': 'png',
//     'image/jpeg': 'jpeg',
//     'image/jpg': 'jpg'
// };

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

//create post

router.post(
  "/createpost",
  uploadOptions.single("post_image"),
  async (req, res) => {
    try {
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

      console.log("ThumbnailAddress: ", thumbnailAddress);
      // console.log("myThumbnail:", myThumbnail);
      // thumbnail end
      let createpost = new UserPost({
        post_title: req.body.post_title,
        post_description: req.body.post_description,
        post_image: file != null ? `/public/uploads/${file.filename}` : "",
        userid: req.body.userid,
        post_type: parseInt(req.body.post_type),
        postAnonymouse: req.body.postAnonymouse,
        thumbnail: fileName
          ? `/public/uploads/${fileName}`.replace("./", "/")
          : "",
      });

      createpost = await createpost.save();

      if (!createpost) {
        return res.status(200).json({
          success: false,
          message: "post creation failed",
        });
      }

      res.status(200).json({
        success: true,
        message: "post is created successfully",
        data: createpost,
      });
    } catch (error) {
      console.log("error:", error);
    }
  }
);

router.post(
  "/createrepost",
  uploadOptions.single("post_image"),
  async (req, res) => {
    //  console.log(req.body);

    const file = req.file;
    // console.log(req.file);

    let createpost = new UserPost({
      post_title: req.body.post_title,
      post_description: req.body.post_description,
      post_image:
        file != null ? `/public/uploads/${file.filename}` : req.body.post_image,
      userid: req.body.userid,
      thumbnail: req.body.post_image.replaceAll("mp4", "jpeg"),
      post_type: req.body.post_type,
      sharedby: req.body.sharedby,
      postAnonymouse: req.body.postAnonymouse,
    });
    console.log(createpost);

    createpost = await createpost.save();

    if (!createpost) {
      return res.status(200).json({
        success: false,
        message: "post not create",
      });
    }
    let getpost = await UserPost.find()
      .populate([
        "userid",
        "sharedby",
        {
          path: "comments",
          populate: {
            path: "userid",
            model: "users",
          },
        },
      ])
      .sort({ createdOn: -1 });
    res.status(200).json({
      success: true,
      message: "post is update",
      data: getpost,
    });
  }
);

router.post("/createpostcomment/:id", async (req, res) => {
  let postcommentbyuser = await UserPost.findByIdAndUpdate(req.params.id, {
    $push: {
      comments: {
        comment: req.body.comment,
        userid: req.body.userid,
        mentions: req.body.mentions,
      },
    },
  });
  req.body.mentions.forEach(async (element) => {
    const usermentioned = await Users.findOne(
      { _id: element.userid },
      { userNotificationToken: 1 }
    );
    if (usermentioned.isNotification == true) {
      await push_notifications({
        user_device_token: usermentioned.userNotificationToken,
        title: "You are mention on this post",
        body: `${req.protocol}://${req.hostname}/api/v1/getpostbyid/${req.params.id}`,
      });
    }

    let postnotification = new UserNotification({
      title: req.body.title,
      subtitle: req.body.subtitle,
      notificationtype: 2,
      userid: element.useridmention,
      userdata: req.body.userdata,
    });
    postnotification.save();
  });

  if (!postcommentbyuser) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }

  res.status(200).json({
    success: true,
    message: "update comment on post",
    data: postcommentbyuser,
  });
});

router.post("/createpostreplycomment/:id/:ind", async (req, res) => {
  let postcommentbyuser = await UserPost.findById(req.params.id).then(
    async (val) => {
      console.log(val.comments[req.params.ind]);
      val.comments[req.params.ind].comments.push({
        comment: req.body.comment,
        userid: req.body.userid,
        mentions: req.body.mentions,
      });
      console.log(val.comments[req.params.ind]);
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
      // {
      //     $push: {

      //         'comments.comments': {
      //             comment: req.body.comment,
      //             userid: req.body.userid,
      //             mentions: req.body.mentions
      //         }

      //     }
      // }
    }
  );

  // req.body.mentions.forEach(element => {
  //     console.log(element);
  //     let postnotification = new UserNotification({
  //         title: req.body.title,
  //         subtitle: req.body.subtitle,
  //         notificationtype: 2,
  //         userid: element.useridmention,
  //         userdata: req.body.userdata,
  //     })
  //     console.log(postnotification);

  //     postnotification.save()
  // });
});

router.delete("/deletecomment/:id/:id2", async (req, res) => {
  let postcommentbyuser = await UserPost.findByIdAndUpdate(req.params.id, {
    $pull: {
      comments: { _id: req.params.id2 },
    },
  });

  if (!postcommentbyuser) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }

  res.status(200).json({
    success: true,
    message: "comment deleted",
    data: postcommentbyuser,
  });
});

router.post("/addlikeonpost/:id/:liketype/", async (req, res) => {
  console.log(req.params.liketype);
  let addlike = await UserPost.findByIdAndUpdate(req.params.id, {
    $push: {
      post_likes: {
        user: req.body.userid,
        liketype: req.params.liketype,
      },
    },
  });
  if (!addlike) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }
  res.status(200).json({
    success: true,
    message: "update comment on post",
    data: addlike,
  });
});

router.post("/removelikeonpost/:id", async (req, res) => {
  let addlike = await UserPost.findByIdAndUpdate(req.params.id, {
    $pull: {
      post_likes: {
        user: req.body.userid,
      },
    },
  });
  if (!addlike) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }
  res.status(200).json({
    success: true,
    message: "update comment on post",
    data: addlike,
  });
});
//get post

router.get("/getpost", async (req, res) => {
  let getpost = await UserPost.find()
    .populate([
      "userid",
      "sharedby",
      {
        path: "comments",
        populate: {
          path: "userid",
          model: "users",
        },
      },
      {
        path: "comments",
        populate: {
          path: "comments",
          populate: {
            path: "userid",
          },
        },
      },
    ])
    .sort({ createdOn: -1 });
  if (!getpost) {
    return res.status(200).json({
      success: false,
      message: "user post not found",
    });
  }
  res.status(200).json({
    success: true,
    message: "user post found",
    data: getpost,
  });
});

//get post by id

router.get("/getpostbyid/:id", async (req, res) => {
  let getpostbyid = await UserPost.findById(req.params.id).sort({
    createdOn: -1,
  });

  if (!getpostbyid) {
    return res.status(200).json({
      success: false,
      message: "post not get by id",
    });
  }

  res.status(200).json({
    success: true,
    message: "get post by id",
    data: getpostbyid,
  });
});
router.get("/getcommentsbyid/:id", async (req, res) => {
  let getpostbyid = await UserPost.findById(req.params.id).populate([
    {
      path: "comments",
      populate: {
        path: "userid",
        model: "users",
      },
    },
    {
      path: "comments",
      populate: {
        path: "comments",
        populate: {
          path: "userid",
        },
      },
    },
  ]);

  if (!getpostbyid) {
    return res.status(200).json({
      success: false,
      message: "post not get by id",
    });
  }

  res.status(200).json({
    success: true,
    message: "get post by id",
    data: getpostbyid.comments,
  });
});

//update post by id

router.put(
  "/updatepostbyid/:id",
  uploadOptions.single("post_image"),
  async (req, res) => {
    const file = req.file;

    let updatepostbyid = await UserPost.findByIdAndUpdate(
      req.params.id,
      {
        post_title: req.body.post_title,
        post_description: req.body.post_description,
        post_image: file != null ? `/public/uploads/${file.filename}` : "",
        userid: req.body.userid,
        post_type: req.body.post_type,
        emoji_link: req.body.emoji_link,
      },
      { new: true }
    );

    if (!updatepostbyid) {
      return res.status(200).json({
        success: false,
        message: "user post not update",
      });
    }

    res.status(200).json({
      success: true,
      message: "user post update",
      data: updatepostbyid,
    });
  }
);

//get post by user

router.get("/getpostbyuser/:id", async (req, res) => {
  let getpostbyuser = await UserPost.find({
    userid: mongoose.Types.ObjectId(req.params.id),
  })
    .populate(["userid"])
    .sort({ createdOn: -1 });

  if (!getpostbyuser) {
    return res
      .status(200)
      .json({ success: false, message: "something went wrong" });
  }
  res.status(200).json({ success: true, data: getpostbyuser });
});

router.get("/getemojis", async (req, res) => {
  var emojislist = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTD7Ea8U5Ng_-fM_l9wmseMCjV6B28r7CV6qGV4hUY5RiZlXDvQwk7Am_EnJs8K4dYNgPM&usqp=CAU",
    "https://m.media-amazon.com/images/I/81GhJuX-uRL.png",
    "https://play-lh.googleusercontent.com/Q8klPWjtLQrBeeP2oDAtA0H0CrYZBpK8ckF3HnqDMT2L6GGdsUCjYc75mfRkoQyhrwfS",
    "https://s3.getstickerpack.com/storage/uploads/sticker-pack/big-emojis/sticker_9.png?3d8aa6a20ba10dd4c6900db192182de0&d=200x200",
  ];
  res.status(200).json({ success: true, data: emojislist });
});

//delete post

router.delete("/deletepost/:id", async (req, res) => {
  let deletepost = await UserPost.findByIdAndDelete(req.params.id);

  if (!deletepost) {
    return res.status(200).json({
      success: false,
      message: "user post not delete",
    });
  }
  res.status(200).json({
    success: true,
    message: "user post delete",
    data: deletepost,
  });
});
module.exports = router;
