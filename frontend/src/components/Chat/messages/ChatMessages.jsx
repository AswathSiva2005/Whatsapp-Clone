import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import Message from "./Message";
import Typing from "./Typing";
import FileMessage from "./files/FileMessage";
import SocketContext from "../../../context/SocketContext";
import PollMessage from "./PollMessage";

function ChatMessages({ typing, searchResults = [], socket }) {
  const { messages, activeConversation } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.user);
  const endRef = useRef();

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Emit delivered status for all messages from other users
  useEffect(() => {
    if (socket && messages.length > 0 && activeConversation?._id) {
      messages.forEach((message) => {
        // If message is not from current user and status is not 'read'
        if (message.sender._id !== user._id && message.status !== "read") {
          // Emit delivered status
          socket.emit("message delivered", {
            messageId: message._id,
            senderId: message.sender._id,
          });
        }
      });
    }
  }, [messages, user._id, activeConversation?._id, socket]);

  // Create a map of message IDs to highlights
  const highlightsMap = {};
  searchResults.forEach((result) => {
    highlightsMap[result.messageId] = result.matches;
  });

  return (
    <div
      className="mb-[60px] bg-[url('https://res.cloudinary.com/dmhcnhtng/image/upload/v1677358270/Untitled-1_copy_rpx8yb.jpg')]
    bg-cover bg-no-repeat
    "
    >
      {/*Container*/}
      <div className="scrollbar overflow_scrollbar overflow-auto py-2 px-[5%]">
        {/*Messages*/}
        {messages &&
          messages.map((message) => (
            <div key={message._id}>
              {/*Message files */}
              {Array.isArray(message.files) && message.files.length > 0
                ? message.files.map((file, index) => (
                    <FileMessage
                      FileMessage={file}
                      message={message}
                      key={`${message._id}-file-${index}`}
                      me={user._id === message.sender._id}
                    />
                  ))
                : null}
              {/*Message text*/}
              {typeof message.message === "string" && message.message.length > 0 ? (
                <Message
                  message={message}
                  key={`${message._id}-text`}
                  me={user._id === message.sender._id}
                  highlights={highlightsMap[message._id] || []}
                />
              ) : null}
              {/*Poll message*/}
              {message.poll?.question ? (
                <PollMessage
                  message={message}
                  me={user._id === message.sender._id}
                />
              ) : null}
            </div>
          ))}
        {typing === activeConversation._id ? <Typing /> : null}
        <div className="mt-2" ref={endRef}></div>
      </div>
    </div>
  );
}

const ChatMessagesWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <ChatMessages {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default ChatMessagesWithSocket;
