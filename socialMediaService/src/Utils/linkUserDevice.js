import mongoose from "mongoose";
import AuthModel from "../DB/Model/authModel.js";
import DeviceModel from "../DB/Model/deviceModel.js";
import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";

export const linkUserDevice = async (authId, deviceToken, deviceType) => {
  // check if all arguments are provided and are of type string
  if (
    !authId ||
    !deviceToken ||
    !deviceType ||
    typeof deviceToken !== "string" ||
    typeof deviceType !== "string"
  ) {
    return { error: "Invalid arguments" };
  }
  // check if deviceToken is valid
  // if ( !deviceToken.match( /^[a-f0-9]{64}$/ ) )
  // {
  //   return { error: 'Invalid device token' };
  // }
  // check if device token is already linked to another user
  const session = await mongoose.startSession().catch((err) => {
    console.log(err);
    return { error: "Internal server error" };
  });
  session.startTransaction();
  try {
    console.log("============ linkUserDevice-INTERNAL ============");
    console.time("linkUserDevice-INTERNAL");
    console.time("existingDevice");
    const existingDevice = await DeviceModel.findOne(
      {
        deviceToken,
        auth: { $ne: authId },
      },
      {},
      {
        session,
        lean: true,
      },
    );
    console.timeEnd("existingDevice");

    if (existingDevice) {
      console.time("found-existingDevice");
      console.log("found existingDevice");
      await AuthModel.findByIdAndUpdate(existingDevice.auth, {
        $pull: { devices: existingDevice._id },
        $addToSet: { loggedOutDevices: existingDevice._id },
      }).session(session);
      console.timeEnd("found-existingDevice");
    }
    console.time("deviceSettings");
    const deviceSettings = await DeviceSettingModel.findOneAndUpdate(
      {
        deviceToken,
        auth: authId,
      },
      {
        $set: {
          isNotificationOn: true,
          isSilent: false,
        },
      },
      {
        upsert: true,
        new: true,
        lean: true,
        session,
      },
    );
    console.timeEnd("deviceSettings");
    console.time("device");
    const device = await DeviceModel.findOneAndUpdate(
      {
        deviceToken,
      },
      {
        $set: {
          deviceType,
          auth: authId,
          $setOnInsert: { createdAt: new Date() },
          status: "active",
          lastSeen: new Date(),
          deviceToken,
          deviceSetting: deviceSettings._id,
        },
      },
      {
        upsert: true,
        new: true,
        lean: true,
        session,
      },
    );
    console.timeEnd("device");
    console.time("auth");
    await AuthModel.findByIdAndUpdate(
      authId,
      {
        $addToSet: { devices: device._id },
        $pull: { loggedOutDevices: device._id },
      },
      {
        session,
        lean: true,
      },
    );
    console.timeEnd("auth");
    await session.commitTransaction();
    session.endSession();
    console.timeEnd("linkUserDevice-INTERNAL");
    console.log("============ linkUserDevice-INTERNAL ============");
    mongoose.connection.close();
    return { device };
  } catch (error) {
    console.timeEnd("linkUserDevice-INTERNAL");
    console.log("============ linkUserDevice-INTERNAL ============");
    await session.abortTransaction();
    session.endSession();
    mongoose.connection.close();
    return { error: "Error while linking device" };
  }
};
