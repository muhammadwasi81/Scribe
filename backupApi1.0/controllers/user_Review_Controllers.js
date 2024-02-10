const { UserReview } = require("../models/user_Review_Model");
const express = require("express");
const router = express.Router();
const { Users } = require("../models/user_Auth_Model");

router.post("/createreview", async (req, res) => {
  let createreview = new UserReview({
    userreview: req.body.userreview,
    userrating: req.body.userrating,
    userid: req.body.userid,
  });

  createreview = await createreview.save();

  if (!createreview) {
    return res.status(200).json({
      success: false,
      message: "user review create",
    });
  }
  console.log(createreview._id.toHexString());
  const userupdatereview = await Users.findByIdAndUpdate(
    req.body.userid,
    {
      $push: {
        userReview: createreview._id.toHexString(),
      },
    },
    { new: true }
  );

  if (!userupdatereview) {
    return res.status(200).json({
      success: false,
      message: "user update review not create",
    });
  }

  res.status(200).json({
    success: true,
    message: "user review create",
    data: userupdatereview,
  });
});

//get review

router.get("/getreview", async (req, res) => {
  let getreview = await UserReview.find().populate("userid");

  if (!getreview) {
    return res.status(200).json({
      success: false,
      message: "user review not get",
    });
  }
  res.status(200).json({
    success: true,
    message: "user review ",
    data: getreview,
  });
});

//get review by id

router.get("/getreviewbyid/:id", async (req, res) => {
  let getreviewbyid = await UserReview.findById(req.params.id);

  if (!getreviewbyid) {
    return res.status(200).json({
      success: false,
      message: "user review not get by id",
    });
  }
  res.status(200).json({
    success: true,
    message: "user review ger by id",
    data: getreviewbyid,
  });
});

//update review

router.put("/updatereviewbyid/:id", async (req, res) => {
  let updatereviewbyid = await UserReview.findByIdAndUpdate(req.params.id, {
    userreview: req.body.userreview,
  });

  if (!updatereviewbyid) {
    return res.status(200).json({
      success: false,
      message: "user review not update by id",
    });
  }
  res.status(200).json({
    success: true,
    message: "user review update by id",
    data: updatereviewbyid,
  });
});

//delete review

router.delete("/deletereview/:id", async (req, res) => {
  let deletereview = await UserReview.findByIdAndDelete(req.params.id);

  if (!deletereview) {
    return res.status(200).json({
      success: false,
      message: "user review not delete",
    });
  }
  res.status(200).json({
    success: true,
    message: "user review delete",
    data: deletereview,
  });
});

module.exports = router;
