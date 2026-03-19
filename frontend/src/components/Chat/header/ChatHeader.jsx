import { useSelector } from "react-redux";
import {
  CallIcon,
  DotsIcon,
  SearchLargeIcon,
  VideoCallIcon,
} from "../../../svg";
import { capitalize } from "../../../utils/string";
import { useState } from "react";
import SocketContext from "../../../context/SocketContext";
import {
  getConversationName,
  getConversationPicture,
} from "../../../utils/chat";
import ContactInfoDrawer from "./ContactInfoDrawer";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
function ChatHeader({ online, callUser, socket, onSearchClick, showSearch }) {
  const { activeConversation } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.user);
  const [showContactInfo, setShowContactInfo] = useState(false);

  return (
    <div className="h-[59px] dark:bg-dark_bg_2 flex items-center p16 select-none relative">
      {/*Container*/}
      <div className="w-full flex items-center justify-between">
        {/*left*/}
        <button
          className="flex items-center gap-x-4 hover:dark:bg-dark_bg_3 rounded-lg px-1 py-1"
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
                  : getTwoLetterAvatarUrl(
                      getConversationName(user, activeConversation.users)
                    );
              }}
              className="w-full h-full rounded-full object-cover"
            />
          </span>
          {/*Conversation name and online status*/}
          <div className="flex flex-col">
            <h1 className="dark:text-white text-md font-bold">
              {activeConversation.isGroup
                ? activeConversation.name
                : capitalize(
                    getConversationName(user, activeConversation.users).split(
                      " "
                    )[0]
                  )}
            </h1>
            <span className="text-xs dark:text-dark_svg_2">
              {online ? "online" : ""}
            </span>
          </div>
        </button>
        {/*Right*/}
        <ul className="flex items-center gap-x-2.5">
          <li onClick={() => callUser()}>
            <button className="btn">
              <VideoCallIcon />
            </button>
          </li>
          <li>
            <button className="btn">
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
