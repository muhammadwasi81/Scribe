var FCM = require("fcm-node");
var serverKey =
  "AAAAizPhK04:APA91bFxTZhIhZcJvKJSDCkFlIsbUwgtJjG521cCZKG--n9tnYWWjW-K9dWDx0HTFTbDKeqa86KSGFbPoDuMvzcWAckHFbd2zUVsK9PTNXb7ENzEhk9VpwglApSctea_50HJcUNXdPPH";
var fcm = new FCM(serverKey);

const sendNotification = (token, title, body) => {
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

module.exports = sendNotification;
