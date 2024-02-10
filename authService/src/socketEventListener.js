// // import {ChatControls} from "../../auth/src/Controller/ChatController.js";

// export const socketEventListner = (socket) => {
//     // Get Socket ID of User
//     console.log("New WS Connection...", socket.id);
//     socket.on("getAllChatRoomsOfUser", async (data) => {
//     var UserChatRoom = "user_" + data.user.id;
//     socket.join(UserChatRoom);
//     const AllChatRooms = await ChatControls.GetAllChatRoomsOfUser(data);
//     // console.log(AllChatRooms, "AllChatRooms");
//     io.to(UserChatRoom).emit("getAllChatRoomsOfUser", AllChatRooms);
//     });
//     socket.on("createChatRoom", async (data) => {
//     var UserChatRoom = "user_" + data.room.id;
//     socket.join(UserChatRoom);
//     const CreateRoomy = await ChatControls.CreateChatRoom(data);
//     // console.log(CreateRoomy, "CreateRoomy");
//     io.emit("GetCreateRoom", CreateRoomy);
//     });
//     socket.on("getRoomChats", async (data) => {
//     var UserChatRoom = "user_" + data.room.id;
//     socket.join(UserChatRoom);
//     const ChatRoom = await ChatControls.GetChatRoom(data);
//     io.to(UserChatRoom).emit("getRoomChats", ChatRoom);
//     });
//     socket.on("sendChatMessage", async (data) => {
//     var UserChatRoom = "user_" + data.body.roomid;
//     socket.join(UserChatRoom);
//     const SendChatMessage = await ChatControls.SendChatMessage(data);
//     io.to(UserChatRoom).emit("sendChatMessage", SendChatMessage);
//     });
//     socket.on("disconnect", () => {
//     console.log("User has left");
//     });
//     }