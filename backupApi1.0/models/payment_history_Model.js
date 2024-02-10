const mongoose = require("mongoose");

const paymentHistoryschema = new mongoose.Schema({
  price: {
    type: Number,
    default: 0,
  },
  payment_method: {
    type: String,
  },
  subscriptionid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "subscription",
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  }
});

paymentHistoryschema.virtual("id").get(function () {
  return this._id.toHexString();
});

paymentHistoryschema.set("toJSON", {
  virtuals: true,
});

exports.paymentHistory = mongoose.model("paymentHistory", paymentHistoryschema);
exports.paymentHistoryschema = paymentHistoryschema;
