import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Peer from "simple-peer";
import { ChatContainer, WhatsappHome } from "../components/Chat";
import { Sidebar } from "../components/sidebar";
import SocketContext from "../context/SocketContext";
import { fetchContacts } from "../features/userSlice";
import {
  getConversations,
  setActiveConversation,
  updateMessagesAndConversations,
} from "../features/chatSlice";
import { updateMessageStatus } from "../features/chatSlice";
import Call from "../components/Chat/call/Call";
import {
  getDisplayNameForUser,
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../utils/chat";
import axios from "axios";
import { getFileType } from "../utils/file";
import { uploadFiles } from "../utils/upload";
import { getTwoLetterAvatarUrl } from "../utils/avatar";

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
  const { activeConversation, conversations } = useSelector((state) => state.chat);
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
  const remoteStreamRef = useRef(null);

  const safePlay = (element) => {
    if (!element || typeof element.play !== "function") return;
    const playPromise = element.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // mobile browsers can reject autoplay until media metadata is ready
      });
    }
  };

  const attachRemoteStream = (incomingStream) => {
    if (!incomingStream || !userVideo.current) return;
    userVideo.current.srcObject = incomingStream;
    safePlay(userVideo.current);
  };

  const attachRemoteTrack = (track, incomingStream) => {
    if (!track || !userVideo.current) return;

    const streamFromEvent = incomingStream?.[0];
    if (streamFromEvent) {
      attachRemoteStream(streamFromEvent);
      return;
    }

    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }

    const existingTrack = remoteStreamRef.current
      .getTracks()
      .find((t) => t.id === track.id);
    if (!existingTrack) {
      remoteStreamRef.current.addTrack(track);
    }

    userVideo.current.srcObject = remoteStreamRef.current;
    safePlay(userVideo.current);
  };
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
  const [openAddContactPanel, setOpenAddContactPanel] = useState(false);
  const homeDocumentInputRef = useRef(null);
  const [homeDocFiles, setHomeDocFiles] = useState([]);
  const [showDocRecipients, setShowDocRecipients] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [documentRecipients, setDocumentRecipients] = useState([]);
  const [documentRecipientsLoading, setDocumentRecipientsLoading] = useState(false);

  const recipientUsersMap = new Map();
  (Array.isArray(documentRecipients) ? documentRecipients : []).forEach((candidate) => {
    if (!candidate?._id || String(candidate._id) === String(user._id)) return;

    recipientUsersMap.set(String(candidate._id), {
      _id: String(candidate._id),
      name: candidate.name || "",
      displayName:
        getDisplayNameForUser(user.contacts, candidate) ||
        candidate.name ||
        candidate.phone ||
        "User",
      picture: candidate.picture || "",
      phone: candidate.phone || "",
      source: "all-users",
    });
  });

  (user.contacts || []).forEach((contact) => {
    const linkedUser = contact?.user;
    const linkedId = linkedUser?._id || linkedUser;
    if (!linkedId) return;

    const contactName = [contact?.firstName, contact?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const displayName =
      String(contact?.nickname || "").trim() ||
      contactName ||
      linkedUser?.name ||
      contact?.phone;

    recipientUsersMap.set(String(linkedId), {
      _id: String(linkedId),
      name: linkedUser?.name || displayName,
      displayName,
      picture: linkedUser?.picture || contact?.picture || "",
      phone: linkedUser?.phone || contact?.phone || "",
      source: "contact",
    });
  });

  (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
    (conversation?.users || []).forEach((member) => {
      if (!member?._id || String(member._id) === String(user._id)) return;
      const existing = recipientUsersMap.get(String(member._id));
      if (existing) return;
      recipientUsersMap.set(String(member._id), {
        _id: String(member._id),
        name: member.name || "",
        displayName:
          getDisplayNameForUser(user.contacts, member) || member.name || member.phone,
        picture: member.picture || "",
        phone: member.phone || "",
        source: "conversation",
      });
    });
  });

  const recipientUsers = Array.from(recipientUsersMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

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
    safePlay(myVideo.current);
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
      remoteStreamRef.current = null;
      if (myVideo.current) {
        myVideo.current.srcObject = null;
      }
      if (userVideo.current) {
        userVideo.current.srcObject = null;
      }
      if (callAcceptedRef.current) {
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
      attachRemoteStream(stream);
    });
    peer.on("track", (track, incomingStreams) => {
      attachRemoteTrack(track, incomingStreams);
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
      attachRemoteStream(stream);
    });
    peer.on("track", (track, incomingStreams) => {
      attachRemoteTrack(track, incomingStreams);
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
    remoteStreamRef.current = null;
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    if (userVideo.current) {
      userVideo.current.srcObject = null;
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
      if (!navigator?.mediaDevices?.getUserMedia) {
        return null;
      }

      const preferredConstraints =
        callType === "video"
          ? {
              video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 360 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          : {
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            };

      const fallbackConstraints = {
        video: callType === "video",
        audio: true,
      };

      let localStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch {
        localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

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

  const handleOpenDocumentPicker = () => {
    homeDocumentInputRef.current?.click();
  };

  const handleOpenAddContactPanel = () => {
    setOpenAddContactPanel(true);
  };

  const handleAskMetaAi = () => {
    if (typeof window === "undefined") return;
    window.open("https://www.meta.ai/", "_blank", "noopener,noreferrer");
  };

  const handleSelectRecipients = (recipientId) => {
    setSelectedRecipients((prev) => {
      if (prev.includes(recipientId)) {
        return prev.filter((id) => id !== recipientId);
      }
      return [...prev, recipientId];
    });
  };

  const handleCloseDocumentRecipients = () => {
    setShowDocRecipients(false);
    setSelectedRecipients([]);
    setHomeDocFiles([]);
    setDocumentRecipients([]);
  };

  const handleHomeDocumentChange = (e) => {
    const inputFiles = Array.from(e.target.files || []);
    if (inputFiles.length === 0) return;

    const accepted = inputFiles.filter((file) => {
      const validType =
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        file.type === "application/msword" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/vnd.ms-powerpoint" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.rar" ||
        file.type === "application/zip" ||
        file.type === "audio/mpeg" ||
        file.type === "audio/wav";

      return validType && file.size <= 10 * 1024 * 1024;
    });

    if (accepted.length === 0) {
      alert("Please choose valid files (max 10MB each).\nSupported: docs, pdf, zip, mp3, wav.");
      e.target.value = "";
      return;
    }

    setHomeDocFiles(accepted);
    setSelectedRecipients([]);
    setShowDocRecipients(true);
    e.target.value = "";
  };

  const handleSendDocumentsToRecipients = async () => {
    if (selectedRecipients.length === 0 || homeDocFiles.length === 0) {
      return;
    }

    setSendingDocs(true);
    try {
      const filesToUpload = homeDocFiles.map((file) => ({
        file,
        type: getFileType(file.type),
      }));

      const uploadedFiles = await uploadFiles(filesToUpload, token);
      if (!uploadedFiles.length) {
        alert("File upload failed.");
        return;
      }

      for (const receiverId of selectedRecipients) {
        const convoRes = await axios.post(
          `${API_ENDPOINT}/conversation`,
          { receiver_id: receiverId },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const conversationId = convoRes?.data?._id;
        if (!conversationId) {
          continue;
        }

        const messageRes = await axios.post(
          `${API_ENDPOINT}/message`,
          {
            message: "",
            convo_id: conversationId,
            files: uploadedFiles,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (messageRes?.data?._id) {
          socket.emit("send message", messageRes.data);
        }
      }

      dispatch(getConversations(token));
      handleCloseDocumentRecipients();
    } catch {
      alert("Failed to send documents.");
    } finally {
      setSendingDocs(false);
    }
  };

  //get Conversations
  useEffect(() => {
    if (user?.token) {
      dispatch(getConversations(user.token));
      dispatch(fetchContacts(user.token));
    }
  }, [dispatch, user?.token]);

  useEffect(() => {
    if (!showDocRecipients || !token) return;

    let cancelled = false;
    const loadRecipients = async () => {
      setDocumentRecipientsLoading(true);
      try {
        const { data } = await axios.get(`${API_ENDPOINT}/user/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setDocumentRecipients(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setDocumentRecipients([]);
        }
      } finally {
        if (!cancelled) {
          setDocumentRecipientsLoading(false);
        }
      }
    };

    loadRecipients();

    return () => {
      cancelled = true;
    };
  }, [showDocRecipients, token]);

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
          tag: `message-${message._id}`,
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
            <Sidebar
              onlineUsers={onlineUsers}
              typing={typing}
              openAddContactPanel={openAddContactPanel}
              onAddContactPanelOpened={() => setOpenAddContactPanel(false)}
            />
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
              <WhatsappHome
                onSendDocument={handleOpenDocumentPicker}
                onAddContact={handleOpenAddContactPanel}
                onAskMetaAi={handleAskMetaAi}
              />
            )}
          </div>
        </div>
      </div>

      <input
        ref={homeDocumentInputRef}
        type="file"
        hidden
        multiple
        accept="application/*,text/plain,audio/mpeg,audio/wav"
        onChange={handleHomeDocumentChange}
      />

      {showDocRecipients && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center px-4">
          <div className="w-full max-w-xl dark:bg-dark_bg_2 rounded-xl border dark:border-dark_border_2 overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-b-dark_border_2 flex items-center justify-between">
              <h3 className="dark:text-dark_text_1 font-semibold text-lg">Send documents</h3>
              <button
                type="button"
                className="text-dark_text_2"
                onClick={handleCloseDocumentRecipients}
              >
                Close
              </button>
            </div>

            <div className="px-4 py-3 border-b dark:border-b-dark_border_2">
              <p className="dark:text-dark_text_2 text-sm mb-2">Selected files</p>
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {homeDocFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`} className="text-sm dark:text-dark_text_1 truncate">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <p className="text-sm dark:text-dark_text_2 mb-3">
                Select users ({selectedRecipients.length} selected)
              </p>
              {documentRecipientsLoading ? (
                <p className="text-sm dark:text-dark_text_2">Loading users...</p>
              ) : recipientUsers.length === 0 ? (
                <p className="text-sm dark:text-dark_text_2">No users found.</p>
              ) : (
              <ul className="space-y-2">
                {recipientUsers.map((recipient) => (
                  <li
                    key={recipient._id}
                    className="px-3 py-2 rounded-lg hover:dark:bg-dark_bg_3 cursor-pointer"
                    onClick={() => handleSelectRecipients(recipient._id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(recipient._id)}
                        onChange={() => handleSelectRecipients(recipient._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <img
                        src={recipient.picture || getTwoLetterAvatarUrl(recipient.displayName || "User")}
                        alt={recipient.displayName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getTwoLetterAvatarUrl(
                            recipient.displayName || "User"
                          );
                        }}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="dark:text-dark_text_1 text-sm truncate">
                          {recipient.displayName}
                        </p>
                        <p className="dark:text-dark_text_2 text-xs truncate">
                          {recipient.phone || recipient.name}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              )}
            </div>

            <div className="px-4 py-3 border-t dark:border-t-dark_border_2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg dark:bg-dark_bg_3 dark:text-dark_text_1"
                onClick={handleCloseDocumentRecipients}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-green_1 text-[#0b141a] font-semibold disabled:opacity-50"
                disabled={sendingDocs || selectedRecipients.length === 0}
                onClick={handleSendDocumentsToRecipients}
              >
                {sendingDocs ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

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
