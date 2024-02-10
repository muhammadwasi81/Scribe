const { Subscription } = require("../models/Subscription_Model");
const express = require("express");
const router = express.Router();
const { Users } = require("../models/user_Auth_Model");
const { paymentHistory } = require("../models/payment_history_Model");

//user subcription
router.post("/createsubscription", async (req, res) => {
  const { title, posting, unlimited_note, scribble_package, price } = req.body;
  let createsubscription = new Subscription({
    title,
    posting,
    unlimited_note,
    scribble_package,
    price,
  });
  createsubscription = await createsubscription.save();

  if (!createsubscription) {
    return res.status(200).json({
      success: false,
      message: "user not subscribe",
    });
  }
  return res.status(200).json({
    success: true,
    message: "Subscription saved successfully",
  });
});

//get
router.get("/getsubscription", async (req, res) => {
  let createsubscription = await Subscription.find().populate("subscribedUsers");

  if (!createsubscription) {
    return res.status(200).json({
      success: false,
      message: "subscribe not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "subscribe found",
    data: createsubscription,
  });
});

router.put("/updatesubscription/:id", async (req, res) => {
  const { id } = req.params;
  const isdata = await Subscription.findById(id);
  if (!isdata) {
    return res.status(200).send({
      success: false,
      message: "Invlaid id",
    });
  }
  await Subscription.findOneAndUpdate({ _id: id }, req.body);
  res.status(200).send({
    success: true,
    message: "Subscription updated successfully",
  });
});

router.delete("/deletesubscription/:id", async (req, res) => {
  const { id } = req.params;
  const isdata = await Subscription.findById(id);
  if (!isdata) {
    return res.status(200).send({
      success: false,
      message: "Invlaid id",
    });
  }
  await Subscription.findOneAndRemove({ _id: id });
  res.status(200).send({
    success: true,
    message: "Subscription deleted successfully",
  });
});

router.post("/subscribe", async (req, res) => {
  const { subscriptionid, userid } = req.body;
  if (!(subscriptionid && userid)) {
    res.status(200).send({
      success: false,
      message: "All data is required",
    });
  }
  await Users.findOneAndUpdate(
    { _id: userid },
    {
      $push: {
        userSubscription: subscriptionid,
      },
    },
    { new: true }
  );
  await Subscription.findOneAndUpdate(
    { _id: subscriptionid },
    { $push: { subscribedUsers: userid } },
    { new: true }
  );

  const payHistory = new paymentHistory({
    userid,
    subscriptionid,
    price: req.body.payment,
    payment_method: req.body.payment_method,
  });
  const data = await payHistory.save();
  if (!data) {
    return res.status(200).send({
      success: false,
      message: "Payment history not created",
    });
  }
  return res.status(200).send({
    success: true,
    message: "Payment history created Successfully",
    data
  });
});

module.exports = router;
