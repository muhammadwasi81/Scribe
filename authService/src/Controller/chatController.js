// import ChatModel from "../DB/Model/chat";
// import AuthModel from "../DB/Model/authModel.js";


// //get all chat of user

//   export const GetAllChatRoomsOfUser = async (req) => {
//     try {
//     // Get All Chat Rooms where Status is Accepted or Pending
//     const ChatRooms = await ChatModel.find({
//     $or: [
//     { user1: req.user.id, status: { $in: ["Accepted", "Pending"] } },
//     { user2: req.user.id, status: { $in: ["Accepted", "Pending"] } },
//     ],
//     });
    
//     if (!ChatRooms) {
//     return "Chat Room Not Found";
//     }
    
//     const ChatRppm = ChatRooms.map(async (ChatRoom) => {
//     var User1;
//     var User2;
//     if (ChatRoom.user1) {
//     // First Find In Parents
//     User1 = await AuthModel.findById(ChatRoom.user1);
//     }
//     if (ChatRoom.user2) {
//     // First Find In Parents
//     User2 = await AuthModel.findById(ChatRoom.user2);
//     }
    
//     // Swap User1 and User2 if User1 is not the current user
//     if (User1._id.toString() !== req.user.id.toString()) {
//     var temp = User1;
//     User1 = User2;
//     User2 = temp;
//     }
//     const ChatObj = {
//     ChatRoom: ChatRoom,
//     User1: User1,
//     User2: User2,
//     };
    
//     return ChatObj;
//     });
    
//     const ChatRoomsRes = await Promise.all(ChatRppm);
    
//     return ChatRoomsRes;
//     } catch (error) {
//     console.error(error);
//     return error;
//     }
//     };
    

//     //create chat room
//   export  const CreateChatRoom = async (req) => {
//     try {
//     const { error } = CreateChatRoomValidation.validate(req.body);
//     if (error) {
//     return error.details[0].message;
//     }
//     const { user1, user2 } = req.body;
    
//     const AceptedRequest = await RequestModel.findOne({
//     $or: [
//     { send_by: user1, to: user2, request_status: "Accepted" },
//     { send_by: user2, to: user1, request_status: "Accepted" },
//     ],
//     });
    
//     if (!AceptedRequest) {
//     return "Request Not Accepted";
//     }
    
//     // Check if Chat Room Already Exists
//     const ChatRoomExists = await ChatModel.findOne({
//     $or: [
//     { user1, user2 },
//     { user1: user2, user2: user1 },
//     ],
//     });
//     if (ChatRoomExists) {
//     return "Chat Room Already Exists";
//     }
//     const RoomInfo = await ChatModel.create({
//     user1,
//     user2,
//     });
    
//     return "Chat Room Created Successfully";
//     } catch (error) {
//     console.error(error);
//     return error;
//     }
//     };
    

//     //get chat room
//  export   const GetChatRoom = async (req) => {
//     try {
//     const ChatRoom = await ChatModel.findOne({
//     _id: req.room.id,
//     });
//     if (!ChatRoom) {
//     return "Chat Room Not Found";
//     }
//     // Get User Details
//     var User1;
//     var User2;
//     if (ChatRoom.user1) {
//     // First Find In Parents
//     User1 = await AuthModel.findOne({ _id: ChatRoom.user1 });
//     }
//     if (ChatRoom.user2) {
//     // First Find In Parents
//     User2 = await AuthModel.findOne({ _id: ChatRoom.user2 });
//     }
    
//     if (!User1) {
//     return "User Not Found";
//     }
//     // Map on ChatRoom.message
//     const ChatRoomMessages = await ChatRoom.message.map((message) => {
//     var User;
//     if (message.user) {
//     // First Find In Parents
//     User = User1._id.toString() === message.user.toString() ? User1 : User2;
//     }
//     return {
//     message: message.message,
//     messagetype: message.messagetype,
//     lastSeen: message.lastSeen,
//     time: message.time,
//     user: {
//     _id: User._id,
//     fullName: User.first_name,
//     },
//     };
//     });
//     // Swap User1 and User2 if User1 is not the current user
//     if (User1._id.toString() !== req.user.id.toString()) {
//     var temp = User1;
//     User1 = User2;
//     User2 = temp;
//     }
//     const ChatObj = {
//     ChatRoom: ChatRoomMessages,
//     User1: User1,
//     User2: User2,
//     };
    
//     const ChatRoomRes = ChatObj;
    
//     return ChatRoomRes;
//     } catch (error) {
//     console.error(error);
//     return error;
//     }
//     };
    

//     //send chat message
//  export   const SendChatMessage = async (req) => {
//     try {
//     const { error } = SendChatMessageValidation.validate(req.body);
//     if (error) {
//     return error.details[0].message;
//     }
//     const { roomid, user, message, lastSeen } = req.body;
    
//     const ChatRoom = await ChatModel.findByIdAndUpdate(
//     roomid,
//     {
//     $push: {
//     messages: {
//     message: message,
//     messagetype: 0,
//     lastSeen: lastSeen,
//     user: user,
//     },
//     },
//     },
//     { new: true }
//     );
    
//     if (!ChatRoom) {
//     return "Chat Room Not Found";
//     }
//     // Get User Details
//     var User1;
//     var User2;
//     if (ChatRoom.user1) {
//     // First Find In Parents
//     User1 = await AuthModel.findById(ChatRoom.user1);
//     }
//     if (ChatRoom.user2) {
//     // First Find In Parents
//     User2 = await AuthModel.findById(ChatRoom.user2);
//     }
//     if (User1._id.toString() !== user.toString()) {
//     sendNotification(
//     User1.user_device_token,
//     "New Message",
//     "You have a new message from " + User2.first_name
//     );
//     }
//     if (User2._id.toString() !== user.toString()) {
//     sendNotification(
//     User2.user_device_token,
//     "New Message",
//     "You have a new message from " + User1.first_name
//     );
//     }
//     // if (!User1 || !User2) {
//     // return "User Not Found";
//     // }
//     console.log(Chat);
//     const ChatRoomMessages = await ChatRoom.message.map((message) => {
//     var User;
//     if (message.user) {
//     // First Find In Parents
//     User = User1._id.toString() === message.user.toString() ? User1 : User2;
//     // Send Notification To Other User
//     }
//     return {
//     message: message.message,
//     messagetype: message.messagetype,
//     lastSeen: message.lastSeen,
//     time: message.time,
//     user: {
//     _id: User._id,
//     fullName: User.first_name,
//     },
//     };
//     });
//     // Swap User1 and User2 if User1 is not the current user
//     if (User1._id.toString() !== user.toString()) {
//     var temp = User1;
//     User1 = User2;
//     User2 = temp;
//     }
//     const ChatObj = {
//     ChatRoom: ChatRoomMessages,
//     User1: User1,
//     User2: User2,
//     };
    
//     const ChatRoomRes = ChatObj;
    
//     return ChatRoomRes;
//     } catch (error) {
//     console.error(error);
//     return error;
//     }
//     };
    
//     // const ChatControls = {
//     // GetAllChatRoomsOfUser,
//     // CreateChatRoom,
//     // GetChatRoom,
//     // SendChatMessage,
//     // };
    
//     // module.exports = ChatControls;