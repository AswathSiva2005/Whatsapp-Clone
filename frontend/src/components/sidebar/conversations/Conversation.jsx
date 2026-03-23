import { useDispatch, useSelector } from "react-redux";
import SocketContext from "../../../context/SocketContext";
import {
  clearUnreadForConversation,
  open_create_conversation,
  setActiveConversation,
} from "../../../features/chatSlice";
import {
  getDisplayNameForUser,
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../../../utils/chat";
import { dateHandler } from "../../../utils/date";
import { capitalize } from "../../../utils/string";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import { MuteIcon, PinIcon } from "../../../svg";

function Conversation({
  convo,
  socket,
  online,
  typing,
  groupOnlineCount = 0,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
}) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { activeConversation } = useSelector((state) => state.chat);
  const { token } = user;
  const values = {
    receiver_id: getConversationId(user, convo.users),
    isGroup: convo.isGroup ? convo._id : false,
    token,
  };
  const isTypingInCurrentConversation = typing?.conversationId === convo._id;
  const typingUserName = typing?.user?.name || "Someone";
  const typingUserPicture =
    typing?.user?.picture || getTwoLetterAvatarUrl(typingUserName);
  const otherUser = convo?.isGroup
    ? null
    : convo.users?.find((member) => String(member?._id) !== String(user._id));
  const displayName = convo.isGroup
    ? convo.name
    : getDisplayNameForUser(user.contacts, otherUser) ||
      getConversationName(user, convo.users);

  const openConversation = async () => {
    if (convo.isGroup) {
      dispatch(setActiveConversation(convo));
      socket.emit("join conversation", convo._id);
      dispatch(clearUnreadForConversation(convo._id));
      return;
    }

    let newConvo = await dispatch(open_create_conversation(values));
    socket.emit("join conversation", newConvo.payload._id);
    dispatch(clearUnreadForConversation(convo._id));
  };
  return (
    <li
      onClick={() => openConversation()}
      className={`list-none h-[72px] w-full hover:${
        convo._id !== activeConversation._id ? "dark:bg-[#202c33]" : ""
      } cursor-pointer dark:text-dark_text_1 px-3 ${
        convo._id === activeConversation._id ? "dark:bg-[#202c33]" : ""
      }`}
    >
      {/*Container */}
      <div className="relative w-full flex items-center justify-between py-[10px]">
        {/*Left*/}
        <div className="flex items-center gap-x-3">
          {/*Conversation user picture*/}
          <div
            className={`relative min-w-[50px] max-w-[50px] h-[50px] rounded-full overflow-hidden ${
              online ? "online" : ""
            }`}
          >
            <img
              src={
                convo.isGroup
                  ? convo.picture || getTwoLetterAvatarUrl(convo.name)
                  : getConversationPicture(user, convo.users)
              }
              alt="picture"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = convo.isGroup
                  ? getTwoLetterAvatarUrl(convo.name)
                    : getTwoLetterAvatarUrl(displayName);
              }}
              className="w-full h-full object-cover "
            />
          </div>
          {/*Conversation name and message*/}
          <div className="w-full flex flex-col">
            {/*Conversation name*/}
            <h1 className="font-bold flex items-center gap-x-2">
              {capitalize(displayName)}
            </h1>
            {/* Conversation message */}
            <div>
              <div className="flex items-center gap-x-1 dark:text-dark_text_2">
                <div className="flex-1 items-center gap-x-1 dark:text-dark_text_2">
                  {isTypingInCurrentConversation ? (
                    <div className="flex items-center gap-2 text-green_1">
                      <img
                        src={typingUserPicture}
                        alt={typingUserName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getTwoLetterAvatarUrl(typingUserName);
                        }}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-xs truncate max-w-[120px]">
                        {typingUserName}
                      </span>
                      <span className="typing-wave" aria-label="typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </div>
                  ) : (
                    convo.isGroup ? (
                      <p className="text-sm text-dark_text_2">
                        {groupOnlineCount} online
                      </p>
                    ) : (
                      <p className="text-sm">
                        {convo.latestMessage?.message?.length > 25
                          ? `${convo.latestMessage?.message?.substring(0, 25)}...`
                          : convo.latestMessage?.message || ""}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/*Right*/}
        <div className="flex flex-col items-end justify-between text-xs min-w-[64px] h-[44px] py-0.5">
          <span className="dark:text-dark_text_2 text-[12px]">
            {convo.latestMessage?.createdAt
              ? dateHandler(convo.latestMessage?.createdAt)
              : ""}
          </span>
          <div className="flex items-center gap-1">
            {isPinned && (
              <PinIcon className="dark:fill-dark_svg_2" />
            )}
            {isMuted && (
              <MuteIcon className="dark:fill-dark_svg_2" />
            )}
            <span
              className={`min-w-[18px] h-[18px] rounded-full text-[11px] leading-[18px] text-center font-semibold ${
                unreadCount > 0
                  ? "bg-green_1 text-white px-1"
                  : "bg-transparent text-transparent px-0"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount || "0"}
            </span>
          </div>
        </div>
      </div>
      {/*Border*/}
      <div className="ml-16 border-b dark:border-b-[#1f2a30]"></div>
    </li>
  );
}

const ConversationWithContext = (props) => (
  <SocketContext.Consumer>
    {(socket) => <Conversation {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default ConversationWithContext;
