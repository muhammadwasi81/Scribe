import { DeviceSettingModel } from "../DB/Model/deviceSetting.js";
import SupportTicket from "../DB/Model/supportSchema.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import { sendEmails } from "../Utils/SendEmail.js";

export const updateDeviceSetting = async (req, res, next) => {
  const { devicetoken } = req.headers;
  const { isNotificationOn = true, isSilent = true } = req.body;
  const { authId } = req;
  if (typeof isNotificationOn === typeof undefined && typeof isSilent === typeof undefined) {
    return next(CustomError.badRequest("isNotificationOn or isSilent is required"));
  }  
  const updateQuery = {};
  
  updateQuery.isNotificationOn = isNotificationOn === undefined ? true : isNotificationOn;
  updateQuery.isSilent = isSilent === undefined ? true : isSilent;

  return DeviceSettingModel.findOneAndUpdate(
    {
      deviceToken: devicetoken,
      auth: authId,
    },
    {
      $set: updateQuery,
    },
    {
      new: true,
      upsert: true,
    },
  ).then((deviceSetting) => {
    if (deviceSetting) {
      return next(
        CustomSuccess.createSuccess(updateQuery, "Device setting updated successfully", 200),
      );
    }
    return next(CustomError.badRequest("Device setting not found"));
  });
};


export const sendSupportEmail = async (req, res, next) => {
  const { authId } = req;
  console.log({ authId });
  const { subject, message, userEmail } = req.body;
   const email = "info@thescribbleapp.com";
  const showMessage = `<div style="font-family: Arial, sans-serif;">
  <p><strong>From:</strong> ${userEmail}</p>
  <p><strong>Message:</strong></p>
  <p>${message}</p>
  </div>`;
  if (!subject || !message) {
    return next(CustomError.badRequest("Subject and message is required"));
  }

  try {
    const sentEmail = await sendEmails(email, subject, showMessage, null);
    console.log("sentEmaildata", sentEmail);
    const ticket = new SupportTicket({
      authId,
      subject,
      message,
      userEmail,
    });
    console.log(ticket, "ticket******");
    await ticket.save();

    return next(CustomSuccess.createSuccess({}, "Email sent successfully", 200));
  } catch (error) {
    console.log("error", error.message);
    return next(CustomError.badRequest(error.message));
  }
};

