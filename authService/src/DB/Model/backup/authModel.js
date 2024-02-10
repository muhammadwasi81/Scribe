import mongoose, { Schema } from "mongoose";

import bcrypt from "bcrypt";
import { genSalt } from "../../Utils/saltGen.js";

const AuthSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      unique: true,
      trim: true,
      required: true,
    },
    password: {
      type: String,
      trim: true,
    },
    accessToken: {
      type: String,
      trim: true,
      required: false,
    },
    socialType: {
      type: Schema.Types.String,
      enum: ["apple", "facebook", "google"],
    },
    userType: {
      type: String,
      enum: ["Admin", "User"],
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "userType",
      required: false,
    },
    // location: {
    //   type: {
    //     type: Schema.Types.String,
    //     enum: ["Point"],
    //     default: "Point",
    //     required: false,
    //   },
    //   coordinates: {
    //     type: [Schema.Types.Number],
    //     required: false,
    //   },
    // },
    devices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        required: false,
      },
    ],
    loggedOutDevices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        required: false,
      },
    ],
    notificationOn: {
      type: Boolean,
      default: true,
      required: false,
    },
    OTP: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Otp",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

AuthSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, genSalt);
  }
  if (this.isModified("identifier")) {
    this.identifier = await bcrypt.hash(this.identifier, genSalt);
  }
  if (this.isModified("accessToken")) {
    this.accessToken = await bcrypt.hash(this.accessToken, genSalt);
  }
  // if (this.isModified('isDeleted')) {
  //   this.isDeleted = await bcrypt.hash(this.isDeleted, 8);
  // }

  next();
});
AuthSchema.pre("update", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, genSalt);
  }
  if (this.isModified("identifier")) {
    this.identifier = await bcrypt.hash(this.identifier, genSalt);
  }
  if (this.isModified("accessToken")) {
    this.accessToken = await bcrypt.hash(this.accessToken, genSalt);
  }
  // if (this.isModified('isDeleted')) {
  //   this.isDeleted = await bcrypt.hash(this.isDeleted, 8);
  // }

  next();
});

const AuthModel = mongoose.model("Auth", AuthSchema);

export default AuthModel;
