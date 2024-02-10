const { Users } = require("../models/user_Auth_Model");
const { UserPost } = require("../models/user_Post_Model");
const { UserQuestion } = require("../models/user_Question_Model");
const { UserNote } = require("../models/user_Note_Model");
const { UserChatRoom } = require("../models/user_Chatroom_Model");
const { UserNotification } = require("../models/user_Notification_Model");

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const mongoose = require("mongoose");
const { UserReview } = require("../models/user_Review_Model");
const { UserFeed } = require("../models/user_Feed_Model");
const { UserLibaray } = require("../models/user_Library_Model");
const { UserConfirmRequest } = require("../models/user_request_confirm");
const { push_notifications } = require("../config/pushnotification");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
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

//register

router.post("/register", body("userEmail").isEmail(), async (req, res) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    return res.status(200).json({ errors: errors.array() });
  }

  try {
    checkUser = await Users.findOne({
      $or: [
        {
          userName: req.body.userName,
        },
        {
          userEmail: req.body.userEmail,
        },
      ],
    }).exec();
    if (checkUser) {
      return res.status(200).json({
        success: false,
        message: "username or Email is already in used.",
      });
    } else {
      let register = new Users({
        userName: req.body.userName,
        userFullName: req.body.userFullName
          ? req.body.userFullName
          : req.body.userName,
        userEmail: req.body.userEmail,
        userPassword: bcrypt.hashSync(req.body.userPassword, 10),
        userDescribe: req.body.userDescribe,
        userNotificationToken: req.body.user_device_token,
      });
      register = await register.save();
      let createRoom = new UserChatRoom({
        userid: register.id,
        messages: [],
      });
      await createRoom.save();

      var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service: "gmail",
        secure: false,
        port: 465,
        auth: {
          user: process.env.email,
          pass: process.env.password,
        },
      });

      var mailoptions = {
        from: process.env.email,
        to: req.body.userEmail,
        subject: "Verification Link sended to your email address",
        html: `<h1>your verification link is https://${req.headers.host}/api/v1/confirmverify/${register.id}</h1>`,
      };

      transporter.sendMail(mailoptions, function (error, info) {
        if (error) {
          return res.status(200).json({
            success: false,
            message: "Registeration process failed",
          });
        } else {
          return res.status(200).json({
            success: true,
            message:
              "User Register successfully verification code sended to your email address. Please also check your spam folder",
            data: register,
          });
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
});

//login
router.get("/getusernames", async (req, res) => {
  const data = await Users.find({}, { userName: 1 });
  res.status(200).json({
    success: true,
    message: "data get successfully",
    data,
  });
});
router.post("/login", async (req, res) => {
  try {
    const user = await Users.findOne({
      userEmail: req.body.userEmail,
    }).populate(["userfollowers", "userfollowing", "userposts", "image"]);

    if (user && bcrypt.compareSync(req.body.userPassword, user.userPassword)) {
      if (user.userLoginVerified) {
        await Users.updateOne(
          { userEmail: user.userEmail },
          { userNotificationToken: req.body.user_device_token },
          { new: true }
        );
        return res
          .status(200)
          .json({ message: "login successfully", data: user, success: true });
      }
      return res
        .status(200)
        .json({ message: "Please verify your email address", success: false });
    } else {
      return res
        .status(200)
        .json({ message: "Incorrect email or password", success: false });
    }
  } catch (err) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
});

//forget password
router.post("/forgetpassword", async (req, res) => {
  const user = await Users.findOne({ userEmail: req.body.userEmail });

  if (!user) {
    return res.status(200).json({
      success: false,
      message: "email doest not exist in database",
    });
  }

  const sendcode = Math.floor(Math.random() * 90000) + 10000;
  await Users.findByIdAndUpdate(user._id, { otp: sendcode });
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    secure: false,
    port: 465,
    auth: {
      user: process.env.email,
      pass: process.env.password,
    },
  });

  var mailoptions = {
    from: process.env.email,
    to: req.body.userEmail,
    subject: "Verification code to reset password",
    html: `<h1>your code is ${sendcode}</h1>`,
  };

  transporter.sendMail(mailoptions, function (error, info) {
    if (error) {
      return res.status(200).json({
        success: false,
        message: "Error occured sending mail",
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "verification code sent to you email address",
        code: sendcode,
      });
    }
  });
});

router.post("/resendlink", async (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail) {
    return res.status(200).json({
      success: false,
      message: "User Email field is required",
    });
  }
  const userExist = await Users.findOne({ userEmail });
  if (!userExist) {
    return res.status(200).json({
      success: false,
      message: "User doest not exist in database",
    });
  }
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    secure: false,
    port: 465,
    auth: {
      user: process.env.email,
      pass: process.env.password,
    },
  });

  var mailoptions = {
    from: process.env.email,
    to: req.body.userEmail,
    subject: "Verification Link sended to your email address",
    html: `<h1>your verification link is https://${req.headers.hostname}/api/v1/confirmverify/${userExist._id}</h1>`,
  };

  transporter.sendMail(mailoptions, function (error, info) {
    if (error) {
      return res.status(200).json({
        success: false,
        message: "Registeration process failed",
      });
    } else {
      return res.status(200).json({
        success: true,
        message:
          "User Register successfully verification code sended to your email address. Please also check your spam folder",
      });
    }
  });
});
//change password
router.put("/changepassword", async (req, res) => {
  try {
    const { userEmail, otp } = req.body;
    if (!(userEmail && otp)) {
      return res.status(200).json({
        success: false,
        message: "Data is missing",
      });
    }
    const userExist = await Users.findOne({ userEmail });
    if (!userExist) {
      return res.status(200).json({
        success: false,
        message: "User doest not exist in database",
      });
    }
    if (userExist.otp != otp) {
      return res.status(200).json({
        success: false,
        message: "Invalid otp",
      });
    }

    const updateuser = await Users.findOneAndUpdate(
      { userEmail: req.body.userEmail },
      {
        userPassword: bcrypt.hashSync(req.body.userPassword, 10),
        otp: 0,
      },
      { new: true }
    );

    if (!updateuser) {
      return res.status(200).json({
        success: false,
        message: "password not update",
      });
    }

    res.status(200).json({
      success: true,
      message: "password update successfully",
      newpassword: updateuser,
    });
  } catch (err) {}
});

router.post("/requestforconfirm", async (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail) {
    return res.status(200).json({
      success: false,
      message: "User Email field is required",
    });
  }
  const userExist = await Users.findOne({ userEmail });
  if (!userExist) {
    return res.status(200).json({
      success: false,
      message: "User doest not exist in database",
    });
  }
  if (userExist.userVerified) {
    return res.status(200).json({
      success: false,
      message: "User Already verified",
    });
  }
  const alreadyapply = await UserConfirmRequest.findOne(
    { userid: userExist._id },
    {}
  );
  console.log(alreadyapply);
  if (alreadyapply) {
    return res.status(200).json({
      success: false,
      message: "User Already applied for verification",
    });
  }
  const confirmrequest = new UserConfirmRequest({ userid: userExist._id });
  await confirmrequest.save();
  res.status(200).json({
    success: true,
    message: "Request for confirm user is sended for approval.",
  });
});
router.get("/getrequests", async (req, res) => {
  const data = await UserConfirmRequest.find().populate("userid");
  if (data.length > 0) {
    return res.status(200).json({
      success: true,
      message: "Request get successfully",
      data,
    });
  }
  return res.status(200).json({
    success: false,
    message: "Request Not Exist",
  });
});
router.post("/updaterequest/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(200).json({
      success: false,
      message: "id is required",
      // data,
    });
  }
  const dataExist = await UserConfirmRequest.findOne({ _id: id });
  if (!dataExist) {
    return res.status(200).json({
      success: false,
      message: "Invalid id",
      // data,
    });
  }
  // console.log("dataExist:", dataExist);
  if (req.body.status == "approved") {
    const updateuser = await Users.findOneAndUpdate(
      { _id: dataExist.userid },
      { userVerified: true },
      { new: true }
    );
    await UserConfirmRequest.findOneAndUpdate(
      { _id: id },
      { status: req.body.status },
      { new: true }
    );
    if (!updateuser) {
      return res.status(200).json({
        success: false,
        message: "User not approved",
      });
    }
    res.status(200).json({
      success: true,
      message: "User approved successfully",
      data: updateuser,
    });
  }
});

//user likes
router.put("/userlikes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let userdata = await Users.findById(id);
    if (!userdata) {
      return res.status(200).json({
        success: false,
        message: "user not found",
      });
    }
    if (userdata.userlikes.includes(req.body.userid)) {
      userdata.userlikes.splice(userdata.userlikes.indexOf(req.body.userid), 1);

      const updateuserdata = await Users.findByIdAndUpdate(
        id,
        { userlikes: userdata.userlikes },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        message: "user unlike successfully",
        data: updateuserdata,
      });
    } else {
      userdata.userlikes.push(req.body.userid);
      const updateuserdata = await Users.findByIdAndUpdate(
        id,
        {
          $push: {
            userlikes: req.body.userid,
          },
        },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        message: "user like successfully",
        data: updateuserdata,
      });
    }
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
});

//get likes by post id

router.get("/getlikesbypostid/:id", async (req, res) => {
  const { id } = req.params;
  let getlikesbypostid = await UserPost.findOne({
    _id: id,
  }).populate(["post_likes.user"]);

  if (!getlikesbypostid || getlikesbypostid.post_likes?.length == 0) {
    return res.status(200).json({
      success: false,
      message: "likes not get by post id",
    });
  }
  res.status(200).json({
    success: true,
    message: "likes  get by post id",
    count: getlikesbypostid.post_likes.length,
    data: getlikesbypostid.post_likes,
  });
});

//get comment by post id

router.get("/getcommentbypostid/:id", async (req, res) => {
  const { id } = req.params;
  let getcommentsbypostid = await UserPost.findOne({
    _id: id,
  }).populate(["comments.userid"]);

  if (!getcommentsbypostid || getcommentsbypostid.comments?.length == 0) {
    return res.status(200).json({
      success: false,
      message: "No comments exist in this post",
    });
  }
  res.status(200).json({
    success: true,
    message: "Comments get by post id",
    count: getcommentsbypostid.comments.length,
    data: getcommentsbypostid.comments,
  });
});

//get subscrption by user

router.get("/getsubscriptionbyuser/:id", async (req, res) => {
  let getsubscriptionbyuser = await Users.find({
    userSubscription: mongoose.Types.ObjectId(req.params.id),
  }).populate(["userSubscription"]);

  if (!getsubscriptionbyuser || getsubscriptionbyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "subscription not get by user id",
    });
  }
  res.status(200).json({
    success: true,
    message: "subscription get by user id",
    data: getsubscriptionbyuser,
  });
});
//get review by user

router.get("/getreviewbyuser/:id", async (req, res) => {
  const { id } = req.params;
  let getreviewbyuser = await UserReview.find({
    userid: id,
  }).sort({ createdOn: -1 });

  if (!getreviewbyuser || getreviewbyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "No review exist by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "review get successfully by user",
    data: getreviewbyuser,
  });
});
//get question by user

router.get("/getquestionbyuser/:id", async (req, res) => {
  const { id } = req.params;
  let getquestionbyuser = await UserQuestion.find({
    userid: id,
  }).sort({ CreatedOn: -1 });

  if (!getquestionbyuser || getquestionbyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "No questions exist by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "question get by user",
    data: getquestionbyuser,
  });
});
//get post by user

//get notification by user

router.get("/getnotificationbyuser/:id", async (req, res) => {
  let getnotificationbyuser = await UserNotification.find({
    userid: mongoose.Types.ObjectId(req.params.id),
  }).populate(["userid", "userdata"]);

  if (!getnotificationbyuser) {
    return res.status(200).json({
      success: false,
      message: "notification not get by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "notification get by user",
    data: getnotificationbyuser,
  });
});
//get note by user

router.get("/getnotebyuser/:id", async (req, res) => {
  const { id } = req.params;
  let getnotebyuser = await UserNote.find({
    userid: id,
  });
  console.log(getnotebyuser);
  if (!getnotebyuser || !getnotebyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "There is no note against this user",
    });
  }
  res.status(200).json({
    success: true,
    message: "note get by user",
    data: getnotebyuser,
  });
});
//get library by user

router.get("/getlibrarybyuser/:id", async (req, res) => {
  let getlibrarybyuser = await UserLibaray.find({
    userid: req.params.id,
  }).sort({ createdOn: -1 });

  if (!getlibrarybyuser || getlibrarybyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "No any library exist by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "library get by user",
    data: getlibrarybyuser,
  });
});
//get feed by user

router.get("/getfeedbyuser/:id", async (req, res) => {
  const { id } = req.params;
  let getfeedbyuser = await UserFeed.find({
    userid: id,
  }).sort({ createdOn: -1 });

  if (!getfeedbyuser || getfeedbyuser.length == 0) {
    return res.status(200).json({
      success: false,
      message: "library not get by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "library get by user",
    data: getfeedbyuser,
  });
});

//get chat by user
router.get("/getchatbyuser/:id", async (req, res) => {
  let getchatbyuser = await Users.find({
    userChat: mongoose.Types.ObjectId(req.params.id),
  }).populate(["userChat"]);

  if (!getchatbyuser) {
    return res.status(200).json({
      success: false,
      message: "chat not get by user",
    });
  }
  res.status(200).json({
    success: true,
    message: "chat get by user",
    data: getchatbyuser,
  });
});

//user followers
router.put("/userfollowers/:id", async (req, res) => {
  let userfollowers = await Users.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        userfollowers: req.body.userid,
      },
    },
    { new: true }
  );

  const userfollowing = await Users.findOne(
    { _id: req.params.id },
    { userNotificationToken: 1 }
  );
  const userfollower = await Users.findOne({ _id: req.body.userid });

  if (userfollowing.isNotification == true) {
    await push_notifications({
      user_device_token: userfollowing.userNotificationToken,
      title: "New follower added",
      body: `${userfollower.userFullName} is following you `,
    });
  }

  if (!userfollowers) {
    return res.status(200).json({
      success: false,
      message: "user followers not create",
    });
  }

  res.status(200).json({
    success: true,
    message: "user followers create",
    data: userfollowers,
  });
});

//user following
router.put("/addfollower/:id", async (req, res) => {
  let addfollowing = await Users.findByIdAndUpdate(
    req.body.userid,
    {
      $push: {
        userfollowers: req.params.id,

        // userfollowing: req.params.id
      },
    },
    { new: true }
  );

  let addfollow = await Users.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        // userfollowers: req.body.userid
        userfollowing: req.body.userid,
      },
    },
    { new: true }
  );

  const userfollower = await Users.findOne(
    { _id: req.body.userid },
    { userNotificationToken: 1 }
  );
  const userfollowing = await Users.findOne({ _id: req.params.id });
  if (userfollower.isNotification == true) {
    await push_notifications({
      user_device_token: userfollower.userNotificationToken,
      title: "New follower added",
      body: `${userfollowing.userFullName} is following you `,
    });
  }

  let postnotification = new UserNotification({
    title: req.body.title,
    subtitle: req.body.subtitle,
    notificationtype: req.body.notificationtype,
    userid: req.body.userid,
    userdata: req.body.userdata,
  });
  console.log(postnotification);

  postnotifications = await postnotification.save();

  if (!addfollowing) {
    return res.status(200).json({
      success: false,
      message: "user followers not create",
    });
  }

  res.status(200).json({
    success: true,
    message: "user followers create",
    data: addfollow,
  });
});

router.put("/removefollower/:id", async (req, res) => {
  let addfollowing = await Users.findByIdAndUpdate(
    req.body.userid,
    {
      $pull: {
        userfollowers: req.params.id,

        // userfollowing: req.params.id
      },
    },
    { new: true }
  );

  let addfollow = await Users.findByIdAndUpdate(
    req.params.id,
    {
      $pull: {
        // userfollowers: req.body.userid
        userfollowing: req.body.userid,
      },
    },
    { new: true }
  );

  let postnotification = new UserNotification({
    title: req.body.title,
    subtitle: req.body.subtitle,
    notificationtype: req.body.notificationtype,
    userid: req.body.userid,
    userdata: req.body.userdata,
  });
  console.log(postnotification);

  postnotifications = await postnotification.save();

  if (!addfollowing) {
    return res.status(200).json({
      success: false,
      message: "user followers not create",
    });
  }

  res.status(200).json({
    success: true,
    message: "user followers create",
    data: addfollow,
  });
});

//get user

router.get("/getuser", async (req, res) => {
  let getuser = await Users.find().sort({ userCreatedOn: -1 });

  if (!getuser) {
    return res.status(200).json({
      success: false,
      message: "user not get",
    });
  }

  res.status(200).json({
    success: true,
    message: "user get",
    data: getuser,
  });
});

//get user by id

router.get("/getuserbyid/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  if (id) {
    let getuserbyid = await Users.findById(id);
    if (!getuserbyid) {
      return res.status(200).json({
        success: false,
        message: "user not not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "user  found",
      data: getuserbyid,
    });
  }
  return res.status(200).json({
    success: false,
    message: "userid is required",
  });
});

//update user by id

router.get("/confirmverify/:id", async (req, res) => {
  let updateuserbyid = await Users.findByIdAndUpdate(req.params.id, {
    userLoginVerified: true,
  });

  if (!updateuserbyid) {
    return res.status(200).json({
      success: false,
      message: "user not update by id",
    });
  }

  res.status(200).json({
    message: "Verification completed",
    // success: true,
    // message: "user update by id",
    // data: updateuserbyid
  });
});

router.put("/updateuserbyid/:id", async (req, res) => {
  let updateuserbyid = await Users.findByIdAndUpdate(req.params.id, {
    userFullName: req.body.userFullName,
    userName: req.body.userName,
    userEmail: req.body.userEmail,
    userDescribe: req.body.userDescribe,
    userNotificationToken: req.body.userNotificationToken,
    userBio: req.body.userBio,
    userLastOnline: req.body.userLastOnline,
    userDeviceType: req.body.userDeviceType,

    usershowEmail: req.body.usershowEmail,
  });

  if (!updateuserbyid) {
    return res.status(200).json({
      success: false,
      message: "user not update by id",
    });
  }

  res.status(200).json({
    success: true,
    message: "user update by id",
    data: updateuserbyid,
  });
});

//update profile image
router.put(
  "/profileimage/:id",
  uploadOptions.single("userImage"),
  async (req, res) => {
    console.log(req.file);

    const file = req.file;
    if (!file) return res.status(200).send("No image in the request");

    const fileName = file.filename;
    // const basePath = `https://${req.get("host")}/public/uploads/`;
    const basePath = `/public/uploads/`;

    let profileimage = await Users.findByIdAndUpdate(
      req.params.id,
      {
        userImage: `${basePath}${fileName}`,
      },
      { new: true }
    );

    profileimage = await profileimage.save();

    if (!profileimage) {
      return res.sendStatus(200).json({
        success: false,
        message: "image not create",
      });
    }
    res.send({
      success: true,
      message: "Image saved",
      data: profileimage,
    });
  }
);

router.delete("/deleteuserbyid/:id", async (req, res) => {
  let deleteuserbyid = await Users.findByIdAndDelete(req.params.id);

  if (!deleteuserbyid) {
    return res.status(200).json({
      success: false,
      message: "user not delete by id",
    });
  }
  res.status(200).json({
    success: true,
    message: "user deleted successfully",
  });
});

//count user

router.get("/countuser", async (req, res) => {
  let countuser = await Users.estimatedDocumentCount();

  if (!countuser) {
    return res.status(200).json({
      success: false,
      message: "user not count",
    });
  }

  res.status(200).json({
    success: true,
    message: "user count",
    countuser: countuser,
  });
});

router.get("/getdashboarddata", async (req, res) => {
  try {
    const userData = await Users.find();
    const postData = await UserPost.find();
    const questionData = await UserQuestion.find();
    const noteData = await UserNote.find({ userDeviceType: 0 });
    const usersandroid = await Users.find({ userDeviceType: 0 });
    const usersios = await Users.find({ userDeviceType: 1 });

    return res.status(200).json({
      success: true,
      data: {
        noOfNote: noteData.length,
        noOfQuestions: questionData.length,
        noOfPosts: postData.length,
        noOfUsers: userData.length,
        noOfandroidUsers: usersandroid.length,
        noOfiOSUsers: usersios.length,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      console.error(Object.values(err.errors).map((val) => val.message));
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map((val) => val.message)[0],
      });
    }
    return res.status(400).json({ success: false, message: err });
  }
});

router.get("/getchatbyusers/:id", async (req, res) => {
  console.log(req.params.id);

  let getchats = await UserChatRoom.find({ userid: req.params.id }).populate([
    "userid",
  ]);

  if (!getchats) {
    return res.status(200).json({
      success: false,
      message: "likes not get by post id",
    });
  }
  res.status(200).json({
    success: true,
    message: "",
    data: getchats,
  });
});

router.get("/getallchats", async (req, res) => {
  console.log(req.params.id);

  let getchats = await UserChatRoom.find().populate(["userid"]);

  if (!getchats) {
    return res.status(200).json({
      success: false,
      message: "likes not get by post id",
    });
  }
  res.status(200).json({
    success: true,
    message: "",
    data: getchats,
  });
});

router.post("/insertMessage/:id", async (req, res) => {
  console.log(req.params.id);

  const insert = await UserChatRoom.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        messages: {
          message: req.body.message,
          isAdmin: req.body.isAdmin,
        },
      },
    },
    { new: true }
  );

  if (!insert) {
    return res.status(200).json({
      success: false,
      message: "message send failed",
    });
  }
  res.status(200).json({
    success: true,
    message: "",
    data: insert,
  });
});

module.exports = router;
