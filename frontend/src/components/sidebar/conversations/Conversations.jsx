import { useSelector } from "react-redux";
import { checkOnlineStatus } from "../../../utils/chat";
import Conversation from "./Conversation";

export default function Conversations({
  onlineUsers,
  typing,
  activeView = "all",
  favoriteConversationIds = [],
  unreadByConversation = {},
}) {
  const { conversations, activeConversation } = useSelector(
    (state) => state.chat
  );
  const { user } = useSelector((state) => state.user);

  const visibleConversations = (conversations || [])
    .filter(
      (c) =>
        c.latestMessage ||
        c._id === activeConversation._id ||
        c.isGroup === true
    )
    .filter((conversation) => {
      if (activeView === "favorites") {
        return favoriteConversationIds.includes(conversation._id);
      }
      if (activeView === "unread") {
        return (unreadByConversation[conversation._id] || 0) > 0;
      }
      if (activeView === "groups") {
        return conversation.isGroup === true;
      }
      return true;
    });

  return (
    <div className="convos scrollbar h-[calc(100vh-126px)]">
      <ul>
        {visibleConversations.map((convo) => {
          let check = checkOnlineStatus(onlineUsers, user, convo.users);
          const groupOnlineCount = convo.isGroup
            ? convo.users.filter((member) =>
                onlineUsers.some(
                  (onlineUser) =>
                    String(onlineUser.userId) === String(member._id)
                )
              ).length
            : 0;

          return (
            <Conversation
              convo={convo}
              key={convo._id}
              online={!convo.isGroup && check ? true : false}
              typing={typing}
              groupOnlineCount={groupOnlineCount}
              unreadCount={unreadByConversation[convo._id] || 0}
            />
          );
        })}
      </ul>
    </div>
  );
}
