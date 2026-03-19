import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getConversationMessages } from "../../features/chatSlice";
import { checkOnlineStatus, getConversationId } from "../../utils/chat";
import { ChatActions } from "./actions";
import ChatHeader from "./header/ChatHeader";
import ChatMessages from "./messages/ChatMessages";
import ChatMessageSearch from "./messages/ChatMessageSearch";
import FilesPreview from "./preview/files/FilesPreview";
import axios from "axios";
import SocketContext from "../../context/SocketContext";
import { updateMessageStatus } from "../../features/chatSlice";

function ChatContainer({ onlineUsers, typing, callUser, socket, onBack }) {
  const dispatch = useDispatch();
  const { activeConversation, files, messages } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUserBlockedMe, setIsUserBlockedMe] = useState(false);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const values = {
    token,
    convo_id: activeConversation?._id,
  };

  useEffect(() => {
    if (activeConversation?._id) {
      // Check if current user has blocked the other user
      const otherUser = activeConversation.users.find(
        (u) => u._id !== user._id
      );
      const blocked = user.blockedUsers?.includes(otherUser?._id);
      setIsBlocked(blocked || false);
      setIsUserBlockedMe(otherUser?.blockedUsers?.includes(user._id) || false);

      if (!blocked && !isUserBlockedMe) {
        dispatch(getConversationMessages(values));
      }
    }
  }, [activeConversation]);

  // Emit read status for messages from other users in the active conversation
  useEffect(() => {
    if (socket && messages.length > 0 && activeConversation?._id && !isBlocked && !isUserBlockedMe) {
      messages.forEach((message) => {
        if (message.sender._id !== user._id && message.status !== "read") {
          socket.emit("message read", {
            messageId: message._id,
            senderId: message.sender._id,
          });
          dispatch(updateMessageStatus({ messageId: message._id, status: "read" }));
        }
      });
    }
  }, [activeConversation?._id, messages, user._id, socket, isBlocked, isUserBlockedMe]);

  const handleUnblock = async () => {
    try {
      setUnblockLoading(true);
      const otherUser = activeConversation.users.find(
        (u) => u._id !== user._id
      );
      await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/user/unblock`,
        { userId: otherUser._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsBlocked(false);
      dispatch(getConversationMessages(values));
    } catch (error) {
      console.error("Unblock failed:", error);
    } finally {
      setUnblockLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full border-l dark:border-l-dark_border_2 select-none overflow-hidden">
      {/*Container*/}
      <div>
        {/*Chat header*/}
        <ChatHeader
          online={
            activeConversation.isGroup
              ? false
              : checkOnlineStatus(onlineUsers, user, activeConversation.users)
          }
          callUser={callUser}
          onSearchClick={() => setShowSearch(!showSearch)}
          showSearch={showSearch}
          onBack={onBack}
        />
        {showSearch && (
          <ChatMessageSearch
            onClose={() => setShowSearch(false)}
            onSearch={setSearchResults}
          />
        )}
        {isBlocked || isUserBlockedMe ? (
          <div className="h-[calc(100vh-60px-40px)] flex flex-col items-center justify-center bg-dark_bg_1">
            <div className="text-center">
              <p className="text-dark_text_1 text-lg mb-4">
                {isBlocked
                  ? `You have blocked this user`
                  : `This user has blocked you`}
              </p>
              {isBlocked && (
                <button
                  onClick={handleUnblock}
                  disabled={unblockLoading}
                  className="px-6 py-2 bg-green_1 text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50"
                >
                  {unblockLoading ? "Unblocking..." : "Unblock"}
                </button>
              )}
            </div>
          </div>
        ) : files.length > 0 ? (
          <FilesPreview />
        ) : (
          <>
            {/*Chat messages*/}
            <ChatMessages typing={typing} searchResults={searchResults} />
            {/* Chat Actions */}
            <ChatActions />
          </>
        )}
      </div>
    </div>
  );
}

const ChatContainerWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <ChatContainer {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default ChatContainerWithSocket;
