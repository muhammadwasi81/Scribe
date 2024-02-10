const { UserNotification } = require("../models/user_Notification_Model");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const { Users } = require("../models/user_Auth_Model");
const { push_notifications } = require("../config/pushnotification");
//post notification

router.post("/postnotification", async (req, res) => {
  let postnotification = new UserNotification({
    title: req.body.title,
    subtitle: req.body.subtitle,
    notificationtype: req.body.notificationtype,
    userid: req.body.userid,
    userdata: req.body.userdata,
  });
  postnotification = await postnotification.save();

  if (!postnotification) {
    return res.status(200).json({
      success: false,
      message: "notification not post",
    });
  }
  console.log(postnotification._id.toHexString());
  const userupdatenotification = await Users.findByIdAndUpdate(
    req.body.userid,
    {
      $push: {
        userNotification: postnotification._id.toHexString(),
      },
    },
    { new: true }
  );

  if (!userupdatenotification) {
    return res.status(200).json({
      success: false,
      message: "user update subscription not create",
    });
  }
  res.status(200).json({
    success: true,
    message: "notification post",
    data: userupdatenotification,
  });
});

router.get("/getnotification", async (req, res) => {
  let getnotification = await UserNotification.find();

  if (!getnotification) {
    return res.status(200).json({
      success: false,
      message: "notification not post",
    });
  }
  res.status(200).json({
    success: true,
    message: "notification post",
    data: getnotification,
  });
});

router.post("/sendnotification", async (req, res) => {
  try {
    const { user_device_token, title, body } = req.body;

    await push_notifications({
      user_device_token,
      title,
      body,
    });
    res.status(200).send({
      succcess: true,
      message: "Notifications sent successfully",
    });
  } catch (err) {
    res.status(400).send({
      succcess: false,
      message: err.message,
    });
  }
});

router.post("/togglenotification", async (req, res) => {
  try {
    if (req.body.isNotification == false) {
      let user = await Users.findOneAndUpdate(
        { _id: req.body.userid },
        {
          isNotification: false
        },
        { new: true }
      );
      return res
        .status(200)
        .send({ status: true, message: "Notification Off Successfully", data: user });
    } else if (req.body.isNotification == true) {
      let user = await Users.findOneAndUpdate(
        { _id: req.body.userid },
        {
          isNotification: true
        },
        { new: true }
      );
      return res
        .status(200)
        .send({ status: true, message: "Notification ON Successfully", data: user });
    }
  } catch (e) {
    return res.status(400).send({ status: false, message: "Failed Notification toggle!" });
  }
});


// router.get('/getnotificationbyuser/:id', async (req, res) => {
//     console.log(req.params.id);

//     let getnotification = await UserNotification.find();

//     if (!getnotification) {
//         return res.status(200).json({
//             success: false,
//             message: "notification not post"
//         })
//     }
//     res.status(200).json({
//         success: true,
//         message: "notification post",
//         data: getnotification
//     })
// })

module.exports = router;
