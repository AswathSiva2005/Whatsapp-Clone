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
  socket.on("typing", (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;

    socket.in(conversationId).emit("typing", payload);
  });
  socket.on("stop typing", (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;

    socket.in(conversationId).emit("stop typing", payload);
  });

  //call
  //---call user
  socket.on("call user", (data) => {
    let userId = data.userToCall;
    let userSocketId = onlineUsers.find((user) => user.userId == userId);
    if (!userSocketId?.socketId) return;

    io.to(userSocketId.socketId).emit("call user", {
      signal: data.signal,
      from: data.from,
      name: data.name,
      picture: data.picture,
      callType: data.callType || "video",
      callId: data.callId || null,
    });
  });
  //---answer call
  socket.on("answer call", (data) => {
    io.to(data.to).emit("call accepted", {
      signal: data.signal,
      callId: data.callId || null,
    });
  });

  //---end call
  socket.on("end call", (payload) => {
    if (typeof payload === "string") {
      io.to(payload).emit("end call", {});
      return;
    }

    const to = payload?.to;
    if (!to) return;

    io.to(to).emit("end call", {
      callId: payload?.callId || null,
      reason: payload?.reason || "ended",
    });
  });
}
