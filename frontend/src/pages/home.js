import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Peer from "simple-peer";
import { ChatContainer, WhatsappHome } from "../components/Chat";
import { Sidebar } from "../components/sidebar";
import SocketContext from "../context/SocketContext";
import {
  getConversations,
  setActiveConversation,
  updateMessagesAndConversations,
} from "../features/chatSlice";
import { updateMessageStatus } from "../features/chatSlice";
import Call from "../components/Chat/call/Call";
import {
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../utils/chat";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const API_ENDPOINT = resolveApiEndpoint();

const callData = {
  socketId: "",
  peerSocketId: "",
  peerUserId: "",
  receiveingCall: false,
  callEnded: false,
  name: "",
  picture: "",
  signal: "",
  callType: "video",
  callId: "",
  isGroup: false,
  participants: [],
};
function Home({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const { activeConversation } = useSelector((state) => state.chat);
  const notificationSettings = user?.notificationSettings || {};
  const mutedConversationIds = Array.isArray(notificationSettings.mutedConversations)
    ? notificationSettings.mutedConversations
    : [];
  const [onlineUsers, setOnlineUsers] = useState([]);
  //call
  const [call, setCall] = useState(callData);
  const [stream, setStream] = useState();
  const [show, setShow] = useState(false);
  const { socketId } = call;
  const [callAccepted, setCallAccepted] = useState(false);
  const [totalSecInCall, setTotalSecInCall] = useState(0);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const callAcceptedRef = useRef(false);
  const peerSocketRef = useRef("");
  const callIdRef = useRef("");
  const stopAllRingAudios = () => {
    if (typeof document === "undefined") return;
    const audioElements = Array.from(document.querySelectorAll("audio"));
    audioElements.forEach((audio) => {
      const src = audio.getAttribute("src") || "";
      if (src.includes("ringtone.mp3") || src.includes("ringing.mp3")) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };
  //typing
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    callAcceptedRef.current = callAccepted;
  }, [callAccepted]);

  useEffect(() => {
    peerSocketRef.current = call.peerSocketId || call.socketId || "";
    callIdRef.current = call.callId || "";
  }, [call.peerSocketId, call.socketId, call.callId]);

  useEffect(() => {
    // Attach local media after call UI mounts to avoid ref race conditions.
    if (!show || call.callType !== "video" || !stream) return;
    if (!myVideo.current) return;
    myVideo.current.srcObject = stream;
  }, [show, stream, call.callType]);

  //join user into the socket io
  useEffect(() => {
    socket.emit("join", user._id);
    //get online users
    const onlineUsersHandler = (users) => {
      setOnlineUsers(users);
    };

    socket.on("get-online-users", onlineUsersHandler);

    return () => {
      socket.off("get-online-users", onlineUsersHandler);
    };
  }, [socket, user._id]);

  //call
  useEffect(() => {
    const setupSocketHandler = (id) => {
      setCall((prev) => ({ ...prev, socketId: id }));
    };

    const callUserHandler = (data) => {
      setCallAccepted(false);
      setTotalSecInCall(0);
      setCall((prev) => ({
        ...prev,
        socketId: data.from,
        peerSocketId: data.from,
        peerUserId: data.fromUserId || "",
        name: data.name,
        picture: data.picture,
        signal: data.signal,
        callEnded: false,
        receiveingCall: true,
        callType: data.callType || "video",
        callId: data.callId || "",
        isGroup: Boolean(data.isGroup),
        participants: Array.isArray(data.participants) ? data.participants : [],
      }));
    };

    const endCallHandler = (payload) => {
      stopAllRingAudios();
      setShow(false);
      setCallAccepted(false);
      setTotalSecInCall(0);
      setCall((prev) => ({ ...prev, callEnded: true, receiveingCall: false }));
      if (myVideo.current) {
        myVideo.current.srcObject = null;
      }
      if (callAccepted) {
        connectionRef?.current?.destroy();
      }

      const receivedCallId = payload?.callId;
      if (receivedCallId && token) {
        axios.patch(
          `${API_ENDPOINT}/call/${receivedCallId}/end`,
          { reason: payload?.reason || "ended" },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).catch(() => {});
      }
    };

    const switchToVideoHandler = () => {
      setCall((prev) => ({ ...prev, callType: "video" }));
    };

    const webRtcSignalHandler = (payload) => {
      if (!payload?.signal || !connectionRef.current) return;
      try {
        connectionRef.current.signal(payload.signal);
      } catch {
        // ignore stale renegotiation packets
      }
    };

    const callAcceptedHandler = async (payload) => {
      if (!payload?.from) return;

      stopAllRingAudios();
      setCallAccepted(true);
      setShow(true);
      // Caller (A) receives this - clear ringing state so Ringing component hides
      setCall((prev) => ({
        ...prev,
        peerSocketId: payload?.from || prev.peerSocketId,
        receiveingCall: false,
      }));
      
      const acceptedSignal = payload?.signal || payload;
      const acceptedCallId = payload?.callId;

      if (acceptedCallId && token) {
        try {
          await axios.patch(
            `${API_ENDPOINT}/call/${acceptedCallId}/accept`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch {
          // call media should continue even if status update fails
        }
      }

      if (connectionRef.current) {
        connectionRef.current.signal(acceptedSignal);
      }
    };

    socket.on("setup socket", setupSocketHandler);
    socket.on("call user", callUserHandler);
    socket.on("call accepted", callAcceptedHandler);
    socket.on("end call", endCallHandler);
    socket.on("switch to video", switchToVideoHandler);
    socket.on("webrtc signal", webRtcSignalHandler);

    return () => {
      socket.off("setup socket", setupSocketHandler);
      socket.off("call user", callUserHandler);
      socket.off("call accepted", callAcceptedHandler);
      socket.off("end call", endCallHandler);
      socket.off("switch to video", switchToVideoHandler);
      socket.off("webrtc signal", webRtcSignalHandler);
    };
  }, [socket]);
  //--call user funcion
  const callUser = async (callType = "video") => {
    if (!activeConversation?._id || !user?.token) return;

    const isGroupCall = Boolean(activeConversation?.isGroup);
    const participants = isGroupCall
      ? (activeConversation.users || [])
          .filter((u) => String(u._id) !== String(user._id))
          .map((u) => ({ _id: u._id, name: u.name, picture: u.picture || "" }))
      : [];

    const receiverId = isGroupCall
      ? participants?.[0]?._id || ""
      : getConversationId(user, activeConversation.users);

    if (!receiverId) return;

    let callId = "";

    try {
      const { data } = await axios.post(
        `${API_ENDPOINT}/call/start`,
        {
          receiverId,
          conversationId: activeConversation._id,
          type: callType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      callId = data?._id || "";
    } catch {
      // keep call UI flow even if call log API temporarily fails
    }

    const localStream = await setupMedia(callType);
    if (!localStream) return;

    enableMedia(localStream);
    setCallAccepted(false);
    setTotalSecInCall(0);
    setCall((prev) => ({
      ...prev,
      callEnded: false,
      receiveingCall: false,
      signal: "",
      peerSocketId: "",
      peerUserId: receiverId,
      name: isGroupCall
        ? activeConversation.name
        : getConversationName(user, activeConversation.users),
      picture: isGroupCall
        ? activeConversation.picture || ""
        : getConversationPicture(user, activeConversation.users),
      callType,
      callId,
      isGroup: isGroupCall,
      participants,
    }));
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: localStream,
    });
    peer.on("signal", (data) => {
      if (callAcceptedRef.current && peerSocketRef.current) {
        socket.emit("webrtc signal", {
          to: peerSocketRef.current,
          callId: callIdRef.current || callId,
          signal: data,
        });
        return;
      }

      socket.emit("call user", {
        userToCall: getConversationId(user, activeConversation.users),
        signal: data,
        from: socket.id || socketId,
        fromUserId: user._id,
        name: user.name,
        picture: user.picture,
        isGroup: isGroupCall,
        participants,
        callType,
        callId,
      });
    });
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    connectionRef.current = peer;
  };
  //--answer call  funcion
  const answerCall = async () => {
    stopAllRingAudios();
    setCallAccepted(true);
    setShow(true);
    setCall((prev) => ({ ...prev, receiveingCall: false }));

    const localStream = await setupMedia(call.callType || "video");
    if (!localStream) {
      setCallAccepted(false);
      setShow(false);
      setCall((prev) => ({ ...prev, receiveingCall: true }));
      return;
    }

    enableMedia(localStream);

    // Update refs immediately to ensure upcoming peer signals route correctly
    callAcceptedRef.current = true;
    peerSocketRef.current = call.socketId;
    callIdRef.current = call.callId;
    
    if (call.callId && token) {
      try {
        await axios.patch(
          `${API_ENDPOINT}/call/${call.callId}/accept`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch {
        // continue media flow
      }
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStream,
    });
    peer.on("signal", (data) => {
      if (callAcceptedRef.current && peerSocketRef.current) {
        socket.emit("webrtc signal", {
          signal: data,
          to: peerSocketRef.current,
          callId: callIdRef.current || null,
        });
        return;
      }

      socket.emit("answer call", {
        signal: data,
        to: call.socketId,
        fromUserId: user._id,
        toUserId: call.peerUserId || null,
        callId: call.callId || null,
      });
    });
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    peer.signal(call.signal);
    connectionRef.current = peer;
  };
  //--end call  funcion
  const endCall = async (reason = "ended") => {
    stopAllRingAudios();
    setShow(false);
    setCallAccepted(false);
    setTotalSecInCall(0);
    setCall((prev) => ({ ...prev, callEnded: true, receiveingCall: false }));
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }

    if (call.callId && token) {
      try {
        await axios.patch(
          `${API_ENDPOINT}/call/${call.callId}/end`,
          {
            reason,
            durationSeconds: totalSecInCall,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch {
        // continue ending media flow
      }
    }

    socket.emit("end call", {
      to: call.peerSocketId || call.socketId,
      toUserId: call.peerUserId || null,
      reason,
      callId: call.callId || null,
    });
    connectionRef?.current?.destroy();
  };

  //--------------------------
  const setupMedia = async (callType = "video") => {
    try {
      const constraints = {
        video: callType === "video",
        audio: true,
      };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(localStream);
      return localStream;
    } catch {
      return null;
    }
  };

  const enableMedia = () => {
    setShow(true);
  };

  const switchToVideoCall = async () => {
    if (call.callType !== "audio" || !connectionRef.current) return;

    try {
      const upgradedStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const videoTrack = upgradedStream.getVideoTracks()[0];
      if (videoTrack) {
        connectionRef.current.addTrack(videoTrack, upgradedStream);
      }

      setStream(upgradedStream);
      setCall((prev) => ({ ...prev, callType: "video" }));
      socket.emit("switch to video", {
        to: call.peerSocketId || call.socketId,
        toUserId: call.peerUserId || null,
        callId: call.callId || null,
      });
    } catch {
      // keep audio call active if upgrade fails
    }
  };
  //get Conversations
  useEffect(() => {
    if (user?.token) {
      dispatch(getConversations(user.token));
    }
  }, [dispatch, user?.token]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      notificationSettings?.muteAllNotifications
    ) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [notificationSettings?.muteAllNotifications]);

  useEffect(() => {
    //lsitening to receiving a message
    const receiveMessageHandler = (message) => {
      dispatch(updateMessagesAndConversations(message));

      const conversationId = String(
        message?.conversation?._id || message?.conversation || ""
      );
      const isActiveConversation =
        String(activeConversation?._id || "") === conversationId;
      const isConversationMuted = mutedConversationIds.some(
        (id) => String(id) === conversationId
      );

      if (
        notificationSettings?.muteAllNotifications ||
        isConversationMuted ||
        isActiveConversation
      ) {
        return;
      }

      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      if (Notification.permission !== "granted") {
        return;
      }

      const senderName = message?.sender?.name || "New message";
      const body = message?.message || "Sent you a message";
      const icon = message?.sender?.picture || undefined;

      try {
        const notification = new Notification(senderName, {
          body,
          icon,
          tag: `message-${conversationId}`,
        });
        notification.onclick = () => {
          window.focus();
        };
      } catch {
        // notification failure should not block chat state updates
      }
    };

    //listening when a user is typing
    const typingHandler = (payload) => setTyping(payload);
    const stopTypingHandler = (payload) => {
      setTyping((prevTyping) => {
        if (!prevTyping) return prevTyping;
        if (!payload?.conversationId) return null;
        if (prevTyping.conversationId !== payload.conversationId) {
          return prevTyping;
        }
        if (payload.userId && prevTyping.user?._id !== payload.userId) {
          return prevTyping;
        }
        return null;
      });
    };

    //message status listeners
    const deliveredHandler = ({ messageId }) => {
      dispatch(updateMessageStatus({ messageId, status: "delivered" }));
    };
    const readHandler = ({ messageId }) => {
      dispatch(updateMessageStatus({ messageId, status: "read" }));
    };

    socket.on("receive message", receiveMessageHandler);
    socket.on("typing", typingHandler);
    socket.on("stop typing", stopTypingHandler);
    socket.on("message delivered", deliveredHandler);
    socket.on("message read", readHandler);

    return () => {
      socket.off("receive message", receiveMessageHandler);
      socket.off("typing", typingHandler);
      socket.off("stop typing", stopTypingHandler);
      socket.off("message delivered", deliveredHandler);
      socket.off("message read", readHandler);
    };
  }, [
    dispatch,
    socket,
    activeConversation?._id,
    mutedConversationIds,
    notificationSettings?.muteAllNotifications,
  ]);
  return (
    <>
      <div className="h-[100dvh] dark:bg-[#0b141a] flex overflow-hidden">
        <div className="w-full h-[100dvh] flex flex-col md:flex-row gap-0">
          {/*Sidebar*/}
          <div
            className={`w-full md:w-[380px] lg:w-[420px] md:max-w-[420px] h-full min-w-0 ${
              activeConversation?._id ? "hidden md:block" : "block"
            }`}
          >
            <Sidebar onlineUsers={onlineUsers} typing={typing} />
          </div>

          {/*Chat area*/}
          <div
            className={`w-full h-full min-w-0 ${
              activeConversation?._id ? "block" : "hidden md:block"
            }`}
          >
            {activeConversation._id ? (
              <ChatContainer
                onlineUsers={onlineUsers}
                callUser={callUser}
                typing={typing}
                onBack={() => dispatch(setActiveConversation({}))}
              />
            ) : (
              <WhatsappHome />
            )}
          </div>
        </div>
      </div>
      {/*Call*/}

      <div className={(show || call.signal) && !call.callEnded ? "" : "hidden"}>
        <Call
          call={call}
          setCall={setCall}
          callAccepted={callAccepted}
          myVideo={myVideo}
          userVideo={userVideo}
          stream={stream}
          answerCall={answerCall}
          show={show}
          endCall={endCall}
          switchToVideoCall={switchToVideoCall}
          totalSecInCall={totalSecInCall}
          setTotalSecInCall={setTotalSecInCall}
        />
      </div>
    </>
  );
}

const HomeWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <Home {...props} socket={socket} />}
  </SocketContext.Consumer>
);
export default HomeWithSocket;
