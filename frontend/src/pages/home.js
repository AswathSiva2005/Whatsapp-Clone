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
  receiveingCall: false,
  callEnded: false,
  name: "",
  picture: "",
  signal: "",
  callType: "video",
  callId: "",
};
function Home({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const { activeConversation } = useSelector((state) => state.chat);
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
  //typing
  const [typing, setTyping] = useState(null);

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
      setCall((prev) => ({
        ...prev,
        socketId: data.from,
        name: data.name,
        picture: data.picture,
        signal: data.signal,
        receiveingCall: true,
        callType: data.callType || "video",
        callId: data.callId || "",
      }));
    };

    const endCallHandler = (payload) => {
      setShow(false);
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

    socket.on("setup socket", setupSocketHandler);
    socket.on("call user", callUserHandler);
    socket.on("end call", endCallHandler);

    return () => {
      socket.off("setup socket", setupSocketHandler);
      socket.off("call user", callUserHandler);
      socket.off("end call", endCallHandler);
    };
  }, [socket, callAccepted, token]);
  //--call user funcion
  const callUser = async (callType = "video") => {
    if (!activeConversation?._id || !user?.token) return;

    const receiverId = getConversationId(user, activeConversation.users);
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
    setCall((prev) => ({
      ...prev,
      name: getConversationName(user, activeConversation.users),
      picture: getConversationPicture(user, activeConversation.users),
      callType,
      callId,
    }));
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: localStream,
    });
    peer.on("signal", (data) => {
      socket.emit("call user", {
        userToCall: getConversationId(user, activeConversation.users),
        signal: data,
        from: socketId,
        name: user.name,
        picture: user.picture,
        callType,
        callId,
      });
    });
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    socket.once("call accepted", async (payload) => {
      setCallAccepted(true);
      const acceptedSignal = payload?.signal || payload;
      const acceptedCallId = payload?.callId || callId;

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

      peer.signal(acceptedSignal);
    });
    connectionRef.current = peer;
  };
  //--answer call  funcion
  const answerCall = async () => {
    const localStream = await setupMedia(call.callType || "video");
    if (!localStream) return;

    enableMedia(localStream);
    setCallAccepted(true);
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
      socket.emit("answer call", {
        signal: data,
        to: call.socketId,
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
    setShow(false);
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
      to: call.socketId,
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
  //get Conversations
  useEffect(() => {
    if (user?.token) {
      dispatch(getConversations(user.token));
    }
  }, [dispatch, user?.token]);

  useEffect(() => {
    //lsitening to receiving a message
    const receiveMessageHandler = (message) => {
      dispatch(updateMessagesAndConversations(message));
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
  }, [dispatch, socket]);
  return (
    <>
      <div className="h-screen dark:bg-[#0b141a] flex overflow-hidden">
        <div className="w-full h-screen flex flex-col md:flex-row gap-0">
          {/*Sidebar*/}
          <div
            className={`w-full md:w-[380px] lg:w-[420px] md:max-w-[420px] h-full ${
              activeConversation?._id ? "hidden md:block" : "block"
            }`}
          >
            <Sidebar onlineUsers={onlineUsers} typing={typing} />
          </div>

          {/*Chat area*/}
          <div
            className={`w-full h-full ${
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
