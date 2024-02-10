// Librarys
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import morganBody from "morgan-body";
import path from "path";
import { fileURLToPath } from "url";
// DB Connection
import { connectDB } from "./DB/index.js";
import { AdminRouter } from "./Router/adminRouter.js";
// Response Handler
import { ResHandler } from "./Utils/ResponseHandler/ResHandler.js";

export const filename = fileURLToPath(import.meta.url);
export const dirname = path.dirname(filename);

export let app = express();

const API_PreFix = "";

app.use("/public/uploads", express.static("./public/uploads"));

var corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
// Configure body-parser to handle post requests
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  morgan("dev", {
    skip: (req, res) => {
      return res.statusCode < 400;
    },
  }),
);

morganBody(app, {
  prettify: true,
  logReqUserAgent: true,
  logReqDateTime: true,
  skip: function (req, res) {
    return res.statusCode < 400;
  },
});
// Connect To Database

await connectDB();
// Running Seeder
// RunSeeder();

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the application." });
});
// Routes

app.use(API_PreFix, AdminRouter);

app.use(ResHandler);

//

// io.on("connection", (socket) => {
//   // Get Socket ID of User
//   console.log("New WS Connection...", socket.id);
//   socket.on("getAllChatRoomsOfUser", async (data) => {
//   var UserChatRoom = "user_" + data.user.id;
//   socket.join(UserChatRoom);
//   const AllChatRooms = await ChatControls.GetAllChatRoomsOfUser(data);
//   // console.log(AllChatRooms, "AllChatRooms");
//   io.to(UserChatRoom).emit("getAllChatRoomsOfUser", AllChatRooms);
//   });
//   socket.on("createChatRoom", async (data) => {
//   var UserChatRoom = "user_" + data.room.id;
//   socket.join(UserChatRoom);
//   const CreateRoomy = await ChatControls.CreateChatRoom(data);
//   // console.log(CreateRoomy, "CreateRoomy");
//   io.emit("GetCreateRoom", CreateRoomy);
//   });
//   socket.on("getRoomChats", async (data) => {
//   var UserChatRoom = "user_" + data.room.id;
//   socket.join(UserChatRoom);
//   const ChatRoom = await ChatControls.GetChatRoom(data);
//   io.to(UserChatRoom).emit("getRoomChats", ChatRoom);
//   });
//   socket.on("sendChatMessage", async (data) => {
//   var UserChatRoom = "user_" + data.body.roomid;
//   socket.join(UserChatRoom);
//   const SendChatMessage = await ChatControls.SendChatMessage(data);
//   io.to(UserChatRoom).emit("sendChatMessage", SendChatMessage);
//   });
//   socket.on("disconnect", () => {
//   console.log("User has left");
//   });
//   });
