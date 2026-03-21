import { MessageModel } from "./models/index.js";

let onlineUsers = [];
const activeCalls = new Map();

const getUserSockets = (userId) =>
  onlineUsers
    .filter((user) => String(user.userId) === String(userId))
    .map((user) => user.socketId);

export default function (socket, io) {
  //user joins or opens the application
  socket.on("join", (user) => {
    socket.join(user);
    // allow multi-login sessions by storing each active socket per user
    onlineUsers.push({ userId: user, socketId: socket.id });
    //send online users to frontend
    io.emit("get-online-users", onlineUsers);
    //send socket id
    socket.emit("setup socket", socket.id);
  });

  //socket disconnect
  socket.on("disconnect", () => {
    const activeCall = activeCalls.get(socket.id);
    if (activeCall) {
      if (activeCall.peerSocketId) {
        io.to(activeCall.peerSocketId).emit("end call", {
          callId: activeCall.callId || null,
          reason: "ended",
        });
      }

      if (activeCall.peerUserId) {
        getUserSockets(activeCall.peerUserId).forEach((peerSocketId) => {
          if (peerSocketId !== socket.id) {
            io.to(peerSocketId).emit("end call", {
              callId: activeCall.callId || null,
              reason: "ended",
            });
          }
        });
      }

      if (activeCall.peerSocketId) {
        activeCalls.delete(activeCall.peerSocketId);
      }
      activeCalls.delete(socket.id);
    }

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
    const userId = data.userToCall;
    const recipientSockets = getUserSockets(userId);

    if (recipientSockets.length === 0) return;

    recipientSockets.forEach((socketId) => {
      io.to(socketId).emit("call user", {
        signal: data.signal,
        from: data.from,
        name: data.name,
        picture: data.picture,
        fromUserId: data.fromUserId || null,
        callType: data.callType || "video",
        callId: data.callId || null,
      });
    });
  });
  //---answer call
  socket.on("answer call", (data) => {
    if (data?.to) {
      activeCalls.set(socket.id, {
        peerSocketId: data.to,
        peerUserId: data.toUserId || null,
        callId: data.callId || null,
      });
      activeCalls.set(data.to, {
        peerSocketId: socket.id,
        peerUserId: data.fromUserId || null,
        callId: data.callId || null,
      });
    }

    io.to(data.to).emit("call accepted", {
      signal: data.signal,
      callId: data.callId || null,
      from: socket.id,
    });
  });

  socket.on("webrtc signal", (payload) => {
    const to = payload?.to;
    if (!to) return;

    io.to(to).emit("webrtc signal", {
      signal: payload.signal,
      callId: payload.callId || null,
      from: socket.id,
    });
  });

  //---end call
  socket.on("end call", (payload) => {
    if (typeof payload === "string") {
      io.to(payload).emit("end call", {});

      const activeCall = activeCalls.get(socket.id);
      if (activeCall?.peerUserId) {
        getUserSockets(activeCall.peerUserId).forEach((socketId) => {
          io.to(socketId).emit("end call", {
            callId: activeCall.callId || null,
            reason: "ended",
          });
        });
      }
      return;
    }

    const reason = payload?.reason || "ended";
    const callId = payload?.callId || null;
    const to = payload?.to;

    if (to) {
      io.to(to).emit("end call", {
        callId,
        reason,
      });
    }

    if (payload?.toUserId) {
      getUserSockets(payload.toUserId).forEach((socketId) => {
        io.to(socketId).emit("end call", {
          callId,
          reason,
        });
      });
    }

    const activeCall = activeCalls.get(socket.id);
    if (activeCall?.peerSocketId) {
      activeCalls.delete(activeCall.peerSocketId);
    }
    activeCalls.delete(socket.id);
    if (to) {
      activeCalls.delete(to);
    }
  });

  socket.on("switch to video", (payload) => {
    const to = payload?.to;
    if (to) {
      io.to(to).emit("switch to video", {
        callId: payload?.callId || null,
      });
    }

    const toUserId = payload?.toUserId;
    if (toUserId) {
      getUserSockets(toUserId).forEach((socketId) => {
        io.to(socketId).emit("switch to video", {
          callId: payload?.callId || null,
        });
      });
    }
  });
}
