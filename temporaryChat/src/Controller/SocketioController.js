import { io } from "../app.js";
// import ChatController from "./ChatController.js";
import { getAllChatrooms, getChatroom, sendMessage } from "./chatroomController.js";

export const invalidSocketRequest = ({ disconnect, room, message, socket }) => {
  socket.emit("error", { message: "message" });
  socket.disconnect();
};
export const IoConnection = () => {
console.log("connection")
  io.on("connection", (socket) => {
    // Get Socket ID of User
  console.log("connected" , socket.id);
    console.log("connection by Jason");
    const query = socket.handshake.query;
    const { userId } = query || {
      user: null,
    };
    if (!userId) {
      socket.emit("error", { message: "Please provide a user id" });
      socket.disconnect();
    }
    if (userId) {
      socket.join("user_" + userId);
    }
    socket.on("getAllChatRoomsOfUser", async (data) => {
      console.log("socket rooms", socket.rooms);
      const UserChatRoom = +data.user.id;
      if (socket.rooms.has(UserChatRoom)) {
        socket.leave(UserChatRoom);
      }
      socket.join(UserChatRoom);
      const AllChatRooms = await getAllChatrooms(data);
      // console.log(AllChatRooms, "AllChatRooms");
      io.to(UserChatRoom).emit("chatRoomsOfUser", AllChatRooms);
    });
    // socket.on("createChatRoom", async (data) => {
    //   var UserChatRoom = "user_" + data.room.id;
    //   socket.join(UserChatRoom);
    //   const CreateRoomy = await ChatController.CreateChatRoom(data);
    //   // console.log(CreateRoomy, "CreateRoomy");
    //   io.emit("GetCreateRoom", CreateRoomy);
    // });
    socket.on("getRoomChats", async (data) => {
      var UserChatRoom = "user_" + data.room.id;
      socket.join(UserChatRoom);
      const ChatRoom = await getChatroom(data);
      io.to(UserChatRoom).emit("getRoomChats", ChatRoom);
    });
    socket.on("sendChatMessage", async (data) => {
      await sendMessage(data);
    });
    socket.on("disconnect", () => {
      console.log("User has left");
    });
    socket.on("newMessageRecieved", (data) => {
      socket.send(data);
    });
  });
};
