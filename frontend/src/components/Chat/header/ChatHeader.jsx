import { useSelector } from "react-redux";
import {
  CallIcon,
  DotsIcon,
  ReturnIcon,
  SearchLargeIcon,
  VideoCallIcon,
} from "../../../svg";
import { capitalize } from "../../../utils/string";
import { useState } from "react";
import SocketContext from "../../../context/SocketContext";
import {
  getConversationName,
  getConversationPicture,
  getNicknameForUser,
} from "../../../utils/chat";
import ContactInfoDrawer from "./ContactInfoDrawer";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
function ChatHeader({
  online,
  callUser,
  socket,
  onSearchClick,
  showSearch,
  onBack,
}) {
  const { activeConversation } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.user);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const otherUser = activeConversation?.isGroup
    ? null
    : (activeConversation.users || []).find(
        (member) => String(member?._id || member || "") !== String(user._id || "")
      );
  const otherUserId = String(otherUser?._id || otherUser || "");
  const nickname = getNicknameForUser(user.contacts, otherUserId);
  const displayName = activeConversation?.isGroup
    ? activeConversation.name
    : nickname || getConversationName(user, activeConversation.users) || "User";

  return (
    <div className="h-[59px] dark:bg-dark_bg_2 flex items-center p16 select-none relative">
      {/*Container*/}
      <div className="w-full flex items-center justify-between">
        {/*left*/}
        <div className="flex items-center gap-x-1 sm:gap-x-2">
          {onBack ? (
            <button
              type="button"
              className="btn md:hidden"
              onClick={onBack}
              aria-label="Back to chats"
            >
              <ReturnIcon className="dark:fill-dark_svg_1" />
            </button>
          ) : null}

          <button
            className="flex items-center gap-x-2 sm:gap-x-4 hover:dark:bg-dark_bg_3 rounded-lg px-1 py-1"
            onClick={() => setShowContactInfo(true)}
          >
            {/*Conversation image*/}
            <span className="btn">
              <img
                src={
                  activeConversation.isGroup
                    ? activeConversation.picture || getTwoLetterAvatarUrl(activeConversation.name)
                    : getConversationPicture(user, activeConversation.users)
                }
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = activeConversation.isGroup
                    ? getTwoLetterAvatarUrl(activeConversation.name)
                    : getTwoLetterAvatarUrl(displayName);
                }}
                className="w-full h-full rounded-full object-cover"
              />
            </span>
            {/*Conversation name and online status*/}
            <div className="flex flex-col max-w-[150px] sm:max-w-none">
              <h1 className="dark:text-white text-sm sm:text-md font-bold truncate">
                {activeConversation.isGroup
                  ? activeConversation.name
                  : capitalize(displayName)}
              </h1>
              <span className="text-xs dark:text-dark_svg_2">
                {online ? "online" : ""}
              </span>
            </div>
          </button>
        </div>
        {/*Right*/}
        <ul className="flex items-center gap-x-1 sm:gap-x-2.5">
          <li onClick={() => callUser("video")}>
            <button className="btn flex">
              <VideoCallIcon />
            </button>
          </li>
          <li onClick={() => callUser("audio")}>
            <button className="btn flex">
              <CallIcon />
            </button>
          </li>
          <li>
            <button
              className={`btn ${showSearch ? "dark:bg-dark_bg_3" : ""}`}
              onClick={onSearchClick}
            >
              <SearchLargeIcon className="dark:fill-dark_svg_1" />
            </button>
          </li>
          <li>
            <button className="btn">
              <DotsIcon className="dark:fill-dark_svg_1" />
            </button>
          </li>
        </ul>
      </div>
      {showContactInfo && (
        <ContactInfoDrawer
          activeConversation={activeConversation}
          onClose={() => setShowContactInfo(false)}
        />
      )}
    </div>
  );
}

const ChatHeaderWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <ChatHeader {...props} socket={socket} />}
  </SocketContext.Consumer>
);
export default ChatHeaderWithSocket;
