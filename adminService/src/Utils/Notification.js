import FCM from "fcm-node";
// import { firebase } from "../Config/Firebase.js";
import { config } from "dotenv";

config();
const fcm = new FCM(process.env.FIREBASE_SERVER_KEY);

export const sendNotification = (token, title, body) => {
  // console.log(firebase.serverKey);
  const message = {
    to: token,
    notification: {
      title: title,
      body: body,
    },
  };
  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!", err);
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
};
export const sendNotificationWithPayload = async ({ token, title, body, data }) => {
  const message = {
    to: token,
    notification: {
      title: title,
      body: body,
    },
    data,
  };
  return fcm.send(message, function (err, response) {
    if (err) {
      console.log("Message for payload: ", message);
      console.log("Something has gone wrong!", err);
      return false;
    } else {
      console.log("Successfully sent with response: ", response);
      return true;
    }
  });
};
export const sendNotificationForMessage = ({ token, title, body, data }) => {
  // console.log(firebase.serverKey);

  const message = {
    to: token,
    notification: {
      title: title,
      body: body,
    },
    data,
  };
  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!", err);
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
};
