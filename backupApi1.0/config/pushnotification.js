var FCM = require("fcm-node");
var serverKey =
  "AAAAeI0YmwU:APA91bHaLY645jM8wugGn-_Syu9SdQK8G2eExikSDnYMdXTen3UtD3shAVIaMpzTVYkCMYnrJ6OE9Ux9-6UJJ0pFrz8pE9frK5510IQztLfMQ3mN5aHXm6E9OHrfUKr7slq0UK-lmkFS"; //put your server key here
var fcm = new FCM(serverKey);

const push_notifications = (notification_obj) => {
  var message = {
    to: notification_obj.user_device_token,
    collapse_key: "your_collapse_key",

    notification: {
      title: notification_obj.title,
      body: notification_obj.body,
    },
  };
  console.log("user device token provided",notification_obj.user_device_token);
  fcm.send(message, function (err, response) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully sent with response: ", response);
    }
    
  });
};

module.exports = { push_notifications };
