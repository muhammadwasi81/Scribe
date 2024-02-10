const mongoose = require("mongoose");

const Subscriptionschema = new mongoose.Schema({
  title: {
    type: String,
  },
  posting: {
    type: Boolean,
    default: false,
  },
  unlimited_notes: {
    type: Boolean,
    default: false,
  },

  scribble_package: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
  },
  
  createdOn: {
    type: Date,
    default: Date.now,
  },
  subscribedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
});

Subscriptionschema.virtual("id").get(function () {
  return this._id.toHexString();
});

Subscriptionschema.set("toJSON", {
  virtuals: true,
});

exports.Subscription = mongoose.model("Subscription", Subscriptionschema);
exports.Subscriptionschema = Subscriptionschema;
