export class ChatroomResource {
  constructor(chatroomDB, userId) {
    let receiver;
    if (chatroomDB.users[0]._id.toString() === userId) {
      receiver = chatroomDB.users[1];
    } else {
      receiver = chatroomDB.users[0];
    }
    this.id = chatroomDB._id;
    this.lastMessage = chatroomDB.lastMessage.text;
    this.lastMessageTime = chatroomDB.lastMessage.createdAt;
    this.receiver = {
      id: receiver._id,
      userName: receiver.userName,
      fullName: receiver.fullName,
      image: receiver.image
        ? receiver.image.mediaUrl.replaceAll("\\", "/")
        : "public/uploads/default.png",
    };
    this.hasUnreadMessages = chatroomDB.hasUnreadMessages;
    this.unreadMessagesCount = chatroomDB.unreadMessagesCount || 0;
  }
}
