const mongoose = require("mongoose");

const userchatschema = new mongoose.Schema({
  msg: {
    type: String,
  },
  // lastMsg: {
  //   senderId: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "users",
  //   },

  //   msg: {
  //     type: String,
  //   },
  //   createdOn: {
  //     type: Date,
  //     default: Date.now,
  //   },
  //   isRead: {
  //     type: Boolean,
  //     default: false,
  //   },
  // },

  userid1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  userid2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
});
userchatschema.virtual("id").get(function () {
  return this._id.toHexString();
});

userchatschema.set("toJSON", {
  virtuals: true,
});

exports.UserChatSingle = mongoose.model("userchatsingle", userchatschema);
exports.userchatschema = userchatschema;
