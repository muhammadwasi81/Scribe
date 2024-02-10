const express = require("express");
const app = express();
const http = require("http");
const https = require("https");
const fs = require("fs");
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const { push_notifications } = require("./config/pushnotification");
const { Users } = require("./models/user_Auth_Model");
require("dotenv/config");

const api = process.env.API_URL;
const environment = process.env.ENVIRONMENT;
const server =
  environment === "production"
    ? https.createServer(
        // Provide the private and public key to the server by reading each
        // file's content with the readFileSync() method.
        {
          key: fs.readFileSync(
            "/home/api1jumppace/ssl/keys/9a100_4411d_f5a33bf0b8cef9e23f7a6222a94e52ea.key"
          ),
          cert: fs.readFileSync(
            "/home/api1jumppace/ssl/certs/api1_jumppace_com_9a100_4411d_1678319999_422d9cb7a190cbdf43a31ac47845c0c8.crt"
          ),
          ca: [fs.readFileSync("/home/api1jumppace/ssl/certs/ca_bundle.crt")],
        },
        app
      )
    : http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);
const { UserChatSingle } = require("./models/user_Chat1o1_Model");

var cors = require("cors");
app.use(cors());
//route
const auth = require("./controllers/user_Auth_Controllers");
const userreview = require("./controllers/user_Review_Controllers");
const usersubscription = require("./controllers/user_Subscription_Controllers");
const userpost = require("./controllers/user_Post_Controllers");
const usernote = require("./controllers/user_Note_Controllers");
const userlibrary = require("./controllers/user_Libarary_Controllers");
const userfeed = require("./controllers/user_Feed_Controllers");
const userchat = require("./controllers/user_Chat_Controllers");
const userquestion = require("./controllers/user_Question_Controller");
const usernotification = require("./controllers/user_Notification_Controllers");
const usercomment = require("./controllers/user_comment_controllers");

//middleware
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(`${api}`, auth);
app.use(`${api}`, userreview);
app.use(`${api}`, usersubscription);
app.use(`${api}`, userpost);
app.use(`${api}`, usernote);
app.use(`${api}`, userlibrary);
app.use(`${api}`, userfeed);
app.use(`${api}`, userchat);
app.use(`${api}`, userquestion);
app.use(`${api}`, usernotification);
app.use(`${api}`, usercomment);

app.use("/public/uploads", express.static(__dirname + "/public/uploads"));

mongoose
  .connect(process.env.COLLECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "scribble_production",
  })
  .then(() => {
    console.log("database is connected");
  })
  .catch(() => {
    console.log("database is not connected");
  });
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("getchatlistofuser", async (msg) => {
    let result;
    const newResult = [];
    const currentUserId = msg.userid1;
    if (!currentUserId) {
      console.log("userid is not found");
      return;
    }
    result = await UserChatSingle.aggregate([
      {
        $facet: {
          userid1: [
            {
              $match: {
                userid1: mongoose.Types.ObjectId(currentUserId),
                userid2: { $ne: mongoose.Types.ObjectId(currentUserId) },
              },
            },
            {
              $group: {
                _id: "$userid2",
                messages: { $push: "$$ROOT" },
                mostRecentMessage: { $max: "$createdOn" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 0,
                messages: 1,
                mostRecentMessage: 1,
                otherUser: "$user",
              },
            },
          ],
          userid2: [
            {
              $match: {
                userid2: mongoose.Types.ObjectId(currentUserId),
                userid1: { $ne: mongoose.Types.ObjectId(currentUserId) },
              },
            },
            {
              $group: {
                _id: "$userid1",
                messages: { $push: "$$ROOT" },
                mostRecentMessage: { $max: "$createdOn" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 0,
                messages: 1,
                mostRecentMessage: 1,
                otherUser: "$user",
              },
            },
          ],
        },
      },
      {
        $project: {
          chatrooms: { $concatArrays: ["$userid1", "$userid2"] },
        },
      },
    ]).exec((err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        const { chatrooms } = result[0];
        chatrooms.map((item) => {
          let isDuplicate = false;
          let matches;
          const id = JSON.stringify(item.otherUser);
          const resultStringify = JSON.stringify(newResult);
          isDuplicate = resultStringify.split(id).length > 1 ? true : false;
          // check if the id is already in the newResul t array
          if (!isDuplicate) {
            newResult.push(item);
          }
        });
        io.emit("chatlist", {
          userid2: msg.userid1,
          result: { chatrooms: newResult },
        });
        return result;
      }
    });

    // result = await UserChatSingle.aggregate([
    //   {
    //     $match: {
    //       $or: [
    //         { userid1: mongoose.Types.ObjectId(currentUserId) },
    //         { userid2: mongoose.Types.ObjectId(currentUserId) },
    //       ],
    //     },
    //   },
    //   {
    //     $sort: { createdOn: -1 },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "userid1",
    //       foreignField: "_id",
    //       as: "user1",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "userid2",
    //       foreignField: "_id",
    //       as: "user2",
    //     },
    //   },
    //   {
    //     $unwind: "$user1",
    //   },
    //   {
    //     $unwind: "$user2",
    //   },
    //   {
    //     $project: {
    //       _id: 0,
    //       msg: 1,
    //       otherUser: {
    //         $cond: [
    //           { $eq: ["$user1._id", mongoose.Types.ObjectId(currentUserId)] },
    //           "$user2",
    //           "$user1",
    //         ],
    //       },
    //     },
    //   },
    // ]).exec((err, r) => {
    //   if (err) {
    //     console.log(err);
    //     return err;
    //   } else {
    //     console.log(r);
    //     io.emit("chatlist", { userid2: msg.userid1, result: r });
    //     return r;
    //   }
    // });
    // UserChatSingle.aggregate([
    //   {
    //     $group: {
    //       _id: { userid1: "$userid1", userid2: "$userid2" },
    //       mostRecentMessage: { $max: "$createdOn" },
    //       messages: { $push: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $sort: { mostRecentMessage: -1 },
    //   },
    // ]).exec((err, result) => {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     console.log(result);
    //   }
    // });
  });

  socket.on("getuserchat", async (msg) => {
    console.log(msg);
    const getroomchat = await UserChatSingle.find({
      $or: [
        {
          userid1: { $in: mongoose.Types.ObjectId(msg.userid1) },
          userid2: { $in: mongoose.Types.ObjectId(msg.userid2) },
        },
        {
          userid2: { $in: mongoose.Types.ObjectId(msg.userid1) },
          userid1: { $in: mongoose.Types.ObjectId(msg.userid2) },
        },

        // etc. add your other fields as well here
      ],
    });
    // console.log(getroomchat)
    io.emit("messagerecieved", {
      userId2: msg.userid2,
      result: getroomchat,
    });
  });

  socket.on("sendMessage", async (msg) => {
    const sendMessagetoRoom = UserChatSingle({
      msg: msg.msg,
      userid1: msg.userid1,
      userid2: msg.userid2,
    });
    const send = await sendMessagetoRoom.save();

    const senderId = await Users.findById(msg.userid2.toString());
    const recieverId = await Users.findById(msg.userid1.toString());

    await push_notifications({
      user_device_token: recieverId.userNotificationToken,
      title: senderId.userName.toString(),
      body: `${msg.msg.toString()}`,
    });
    console.log("user1 => ", recieverId);
    console.log("user2 => ", senderId);

    const getroomchat = await UserChatSingle.find({
      $or: [
        {
          userid1: { $in: mongoose.Types.ObjectId(msg.userid1) },
          userid2: { $in: mongoose.Types.ObjectId(msg.userid2) },
        },
        {
          userid2: { $in: mongoose.Types.ObjectId(msg.userid1) },
          userid1: { $in: mongoose.Types.ObjectId(msg.userid2) },
        },

        // etc. add your other fields as well here
      ],
    });
    // console.log(getroomchat)
    io.emit("messagerecieved", {
      userId1: msg.userid1,
      userId2: msg.userid2,
      result: getroomchat,
    });
  });
});

function uniq(a, param) {
  return a.filter(function (item, pos, array) {
    return (
      array
        .map(function (mapItem) {
          return mapItem[param];
        })
        .indexOf(item[param]) === pos
    );
  });
}

app.get("/", (req, res) => {
  res.send(`${api}/oo`);
});

const PORT = process.env.PORT || 3060;

// https
//     .createServer(
//         // Provide the private and public key to the server by reading each
//         // file's content with the readFileSync() method.
//         {
//             key: fs.readFileSync("key.pem"),
//             cert: fs.readFileSync("cert.pem"),
//         },
//         app
//     )
//     .listen(PORT, () => {
//         console.log(`App listening on port ${PORT}!`)
//     });
// app.listen(PORT, () => { console.log(`App listening on port ${PORT}!`); });

server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});
