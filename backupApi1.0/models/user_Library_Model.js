const mongoose = require("mongoose");

const userlibraryschema = new mongoose.Schema({
  booktitle: {
    type: String,
    required: true,
  },
  bookdescription: {
    type: String,
    required: true,
  },

  authername: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    required: true,
  },
  externalLink: {
    type: String,
    required: true,
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "users",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  thumbnail: {
    type: String,
    required: false,
    default: null,
  },
  bookImage: {
    type: String,
    required: true,
  },
  rating: [
    {
      rating: {
        type: Number,
        required: true,
      },
      ratingdescription: {
        type: String,
        required: true,
      },
      userid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "users",
      },
      createdOn: {
        type: Date,
        default: Date.now,
      },
      approved: {
        type: Number,
        default: 0,
      },
    },
  ],
});
userlibraryschema.virtual("id").get(function () {
  return this._id.toHexString();
});

userlibraryschema.set("toJSON", {
  virtuals: true,
});

exports.UserLibaray = mongoose.model("userlibrary", userlibraryschema);
exports.userlibraryschema = userlibraryschema;
