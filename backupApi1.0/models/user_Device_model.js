const mongoose = require("mongoose");

const userdeviceschema = new mongoose.Schema( {
  deviceToken: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    required: true,
    enums: ["ios", "android"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  deviceCreatedOn: {
    type: Date,
    default: Date.now,
  },
  deviceLastOnline: {
    type: Date,
    default: Date.now,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  }
})