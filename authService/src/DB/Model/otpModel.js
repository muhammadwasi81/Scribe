import { Schema, model } from "mongoose";
import { genSalt } from "../../Utils/saltGen.js";
import bcrypt from "bcrypt";
// TODO:
// 1. CREATE MONGOOSE FUNCTION TO EXPIRE OTP AFTER 5 MINUTES
// 2. CREATE MONGOOSE FUNCTION TO DELETE OTP AFTER IT HAS BEEN USED
// 3. CREATE MONGOOSE FUNCTION TO DELETE OTP AFTER IT HAS EXPIRED
const OtpSchema = new Schema(
  {
    otpKey: {
      type: Schema.Types.String,
      required: true,
    },
    auth: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    uid: {
      type: Schema.Types.String,
      required: false,
    },
    otpUsed: {
      type: Schema.Types.Boolean,
      //   required: true,
      default: false,
      enum: [false, true],
    },
    // 1 and 3 point
    // expireAt: {
    //   type: Date,
    //   default: Date.now(Date.now() + 60 * 60 * 1000),
    // },
    reason: {
      type: Schema.Types.String,
      required: true,
      enum: ["login", "verification", "forgotPassword"],
      default: "verification",
    },
  },
  {
    timestamps: true,
    expires: 3600,
  },
);
OtpSchema.pre("save", async function (next) {
  if (this.isModified("otpKey")) {
    this.otpKey = await bcrypt.hash(this.otpKey, genSalt);
  }
  if (this.isModified("uid")) {
    this.uid = await bcrypt.hashSync(this.uid, genSalt);
  }
});

const OtpModel = model("Otp", OtpSchema);

export default OtpModel;
