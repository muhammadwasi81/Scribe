import { Schema, model } from "mongoose";

const DeviceSettingSchema = new Schema(
  {
    deviceToken: {
      type: String,
    },
    auth: {
      type: Schema.Types.ObjectId,
      ref: "auth",
    },
    isNotificationOn: {
      type: Boolean,
      default: true,
    },
    isSilent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

DeviceSettingSchema.index({ deviceToken: 1, auth: 1 }, { unique: true });

export const DeviceSettingModel = model("DeviceSetting", DeviceSettingSchema);
