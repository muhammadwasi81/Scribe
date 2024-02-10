const { UserComment } = require("../models/user_commet_Model");
const { Users } = require("../models/user_Auth_Model");
const express = require("express");
const mongoose = require("mongoose");
const { UserPost } = require("../models/user_Post_Model");
const { push_notifications } = require("../config/pushnotification");
const router = express.Router();

router.post("/createcomment", async (req, res) => {
  let comment = new UserComment({
    usercomment: req.body.usercomment,
    userid: req.body.userid,
    postid: req.body.postid,
  });
  comment = await comment.save();

  const postowner = await UserPost.findOne(
    { _id: req.body.postid },
    { userid: 1 }
  ).populate("userid");

  if (!comment) {
    return res.status(200).json({
      success: false,
      message: "comment not post",
    });
  }

  let postcommentbyuser = await Users.findByIdAndUpdate(req.body.userid, {
    $push: {
      userComment: comment._id.toHexString(),
    },
  });
  if (postowner.userid.isNotification == true) {
    push_notifications({
      user_device_token: postowner.userid.userNotificationToken,
      title: "new comment for your post",
      body: postowner.userid.userName + " You have new comment for your post",
    });
  }

  if (!postcommentbyuser) {
    return res.status(200).json({
      success: false,
      message: "update comment not post",
    });
  }

  res.status(200).json({
    success: true,
    message: "successfully comment on post",
    data: postcommentbyuser,
  });
});

router.get("/getcomment", async (req, res) => {
  let getcomment = await UserComment.find();

  if (!getcomment) {
    return res.status(200).json({
      success: false,
      message: "comment not get",
    });
  }
  res.status(200).json({
    success: true,
    message: "comment get",
    data: getcomment,
  });
});

router.put("/updatecomment/:id", async (req, res) => {
  let updatecomment = await UserComment.findByIdAndUpdate(req.params.id, {
    usercomment: req.body.usercomment,
  });

  if (!updatecomment) {
    return res.status(200).json({
      success: false,
      message: "comment not update",
    });
  }

  res.status(200).json({
    success: true,
    message: "comment update",
    data: updatecomment,
  });
});
//

router.delete("/deletecomment/:id", async (req, res) => {
  let deletecomment = await UserComment.findByIdAndDelete(req.params.id);

  if (!deletecomment) {
    return res.status(200).json({
      success: false,
      message: "comment not delete",
    });
  }
  res.status(200).json({
    success: true,
    message: "comment delete",
    data: deletecomment,
  });
});
//get comment by postid

router.get("/getcommentbypost/:id", async (req, res) => {
  let getcommentbypost = await UserComment.find({
    postid: mongoose.Types.ObjectId(req.params.id),
  }).populate(["postid"]);

  if (!getcommentbypost) {
    return res.status(200).json({
      success: false,
      message: "comment not get by post",
    });
  }

  res.status(200).json({
    success: true,
    message: "comment get by post",
    data: getcommentbypost,
  });
});

module.exports = router;
