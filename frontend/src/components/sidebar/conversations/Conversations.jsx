import { useSelector } from "react-redux";
import { checkOnlineStatus } from "../../../utils/chat";
import Conversation from "./Conversation";

export default function Conversations({
  onlineUsers,
  typing,
  activeView = "all",
  pinnedConversationIds = [],
  archivedConversationIds = [],
  mutedConversationIds = [],
  unreadByConversation = {},
}) {
  const { conversations, activeConversation } = useSelector(
    (state) => state.chat
  );
  const { user } = useSelector((state) => state.user);

  const baseConversations = (conversations || [])
    .filter((conversation) => {
      if (conversation.isGroup) {
        return true;
      }

      const participants = (conversation.users || []).filter(Boolean);
      const hasCurrentUser = participants.some(
        (member) => String(member?._id || member) === String(user?._id || "")
      );
      const hasOtherUser = participants.some(
        (member) => String(member?._id || member) !== String(user?._id || "")
      );

      return hasCurrentUser && hasOtherUser;
    })
    .filter(
      (c) =>
        c.latestMessage ||
        c._id === activeConversation._id ||
        c.isGroup === true
    )
    .filter((conversation) => {
      if (activeView === "archived") {
        return archivedConversationIds.includes(conversation._id);
      }

      if (archivedConversationIds.includes(conversation._id)) {
        return false;
      }

      if (activeView === "pinned") {
        return pinnedConversationIds.includes(conversation._id);
      }

      if (activeView === "unread") {
        return (unreadByConversation[conversation._id] || 0) > 0;
      }
      if (activeView === "groups") {
        return conversation.isGroup === true;
      }
      return true;
    });

  const pinnedSet = new Set(pinnedConversationIds);
  const mutedSet = new Set(mutedConversationIds);
  const pinnedVisible = baseConversations.filter((c) => pinnedSet.has(c._id));
  const unpinnedVisible = baseConversations.filter((c) => !pinnedSet.has(c._id));

  const shouldGroupByPinned = activeView === "all";
  const visibleConversations = shouldGroupByPinned
    ? [...pinnedVisible, ...unpinnedVisible]
    : baseConversations;

  return (
    <div className="convos scrollbar h-[calc(100vh-126px)]">
      <ul>
        {shouldGroupByPinned && pinnedVisible.length > 0 && (
          <li className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-green_1 font-semibold">
            Pinned
          </li>
        )}
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
              isPinned={pinnedSet.has(convo._id)}
              isMuted={mutedSet.has(convo._id)}
            />
          );
        })}
      </ul>
    </div>
  );
}
