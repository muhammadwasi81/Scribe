import NotificationModel from "../DB/Model/notificationModel.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import UserModel from '../DB/Model/userModel.js'

// export const getAllNotification = async (req, res, next) => {
//   const { authId } = req;
//   const { page, limit } = req.query;
//   const totalLimit = parseInt(limit) * parseInt(page) ? parseInt(limit) * parseInt(page) : 20;
//   return NotificationModel.find({ auth: authId })
//     .limit(totalLimit)
//     .sort({ createdAt: -1 })
//     .lean()
//     .then((notifications) => {
//       if (notifications) {
//         return next(CustomSuccess.createSuccess(notifications, "Notification list", 200));
//       }
//       return next(CustomError.badRequest("Notification not found"));
//     })
//     .catch((err) => {
//       return next(CustomError.badRequest(err.message));
//     });
// };

export const getAllNotification = async (req, res, next) => {
  try {
    const { authId } = req;
    const { page, limit } = req.query;
    const totalLimit = parseInt(limit) * parseInt(page) ? parseInt(limit) * parseInt(page) : 20;

    const user = await UserModel.findOne({ auth: authId });
    if (!user) {
      return next(CustomError.badRequest("User not found"));
    }

    let notifications = await NotificationModel.find({ auth: authId })
      .limit(totalLimit)
      .sort({ createdAt: -1 })
      .lean();
  
    if (notifications) {
       notifications = notifications.map(notification => ({
        ...notification,
        userId: user._id
      }));
      return next(CustomSuccess.createSuccess(notifications, "Notifications fetched successfully", 200));
    } else {
      return next(CustomError.badRequest("Notification not found"));
    }
  } catch (err) {
    return next(CustomError.badRequest(err.message));
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  const { authId } = req;
  const { notificationId } = req.body;
  return NotificationModel.findOneAndUpdate(
    {
      _id: notificationId,
      auth: authId,
    },
    {
      $set: {
        isRead: true,
      },
    },
    { new: true },
  )
    .lean()
    .then((notification) => {
      if (notification) {
        return next(CustomSuccess.createSuccess(notification, "Notification marked as read", 200));
      }
      return next(CustomError.badRequest("Notification not found"));
    })
    .catch((err) => {
      return next(CustomError.badRequest(err.message));
    });
};

export const markAllNotificationAsRead = async (req, res, next) => {
  const { authId } = req;
  return NotificationModel.updateMany(
    {
      auth: authId,
    },
    {
      $set: {
        isRead: true,
      },
    },
    { new: true },
  )
    .lean()
    .then((notification) => {
      if (notification) {
        return next(CustomSuccess.createSuccess(notification, "Notification marked as read", 200));
      }
      return next(CustomError.badRequest("Notification not found"));
    })
    .catch((err) => {
      return next(CustomError.badRequest(err.message));
    });
};
