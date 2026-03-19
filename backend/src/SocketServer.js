import { MessageModel } from "./models/index.js";

let onlineUsers = [];
export default function (socket, io) {
  //user joins or opens the application
  socket.on("join", (user) => {
    socket.join(user);
    //add joined user to online users
    if (!onlineUsers.some((u) => u.userId === user)) {
      onlineUsers.push({ userId: user, socketId: socket.id });
    }
    //send online users to frontend
    io.emit("get-online-users", onlineUsers);
    //send socket id
    io.emit("setup socket", socket.id);
  });

  //socket disconnect
  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("get-online-users", onlineUsers);
  });

  //join a conversation room
  socket.on("join conversation", (conversation) => {
    socket.join(conversation);
  });

  //send and receive message
  socket.on("send message", (message) => {
    const conversation = message.conversation;
    if (!conversation.users) return;
    conversation.users.forEach((recipient) => {
      if (String(recipient._id) === String(message.sender._id)) return;

      // If recipient has blocked sender, do not deliver this message.
      const recipientBlockedUsers = recipient.blockedUsers || [];
      const senderId = String(message.sender._id);
      const isSenderBlocked = recipientBlockedUsers.some(
        (blockedId) => String(blockedId) === senderId
      );
      if (isSenderBlocked) return;

      socket.in(recipient._id).emit("receive message", message);

      const recipientIsOnline = onlineUsers.some(
        (u) => String(u.userId) === String(recipient._id)
      );
      if (recipientIsOnline) {
        socket.in(senderId).emit("message delivered", {
          messageId: message._id,
        });
      }
    });
  });

  //message delivered
  socket.on("message delivered", async (data) => {
    const { messageId, senderId } = data;
    try {
      await MessageModel.findByIdAndUpdate(messageId, { status: "delivered" });
    } catch (error) {
      // swallow socket-side status errors to keep chat flow uninterrupted
    }
    socket.in(senderId).emit("message delivered", { messageId });
  });

  //message read
  socket.on("message read", async (data) => {
    const { messageId, senderId } = data;
    try {
      await MessageModel.findByIdAndUpdate(messageId, { status: "read" });
    } catch (error) {
      // swallow socket-side status errors to keep chat flow uninterrupted
    }
    socket.in(senderId).emit("message read", { messageId });
  });

  //typing
  socket.on("typing", (conversation) => {
    socket.in(conversation).emit("typing", conversation);
  });
  socket.on("stop typing", (conversation) => {
    socket.in(conversation).emit("stop typing");
  });

  //call
  //---call user
  socket.on("call user", (data) => {
    let userId = data.userToCall;
    let userSocketId = onlineUsers.find((user) => user.userId == userId);
    io.to(userSocketId.socketId).emit("call user", {
      signal: data.signal,
      from: data.from,
      name: data.name,
      picture: data.picture,
    });
  });
  //---answer call
  socket.on("answer call", (data) => {
    io.to(data.to).emit("call accepted", data.signal);
  });

  //---end call
  socket.on("end call", (id) => {
    io.to(id).emit("end call");
  });
}
