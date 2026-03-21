import { useEffect, useState } from "react";
import { Conversations } from "./conversations";
import { SidebarHeader } from "./header";
import { Search } from "./search";
import { SearchResults } from "./search";
import {
  CallIcon,
  ChatIcon,
  CommunityIcon,
  NotificationIcon,
  StoryIcon,
} from "../../svg";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getTwoLetterAvatarUrl } from "../../utils/avatar";
import StatusPanel from "./header/StatusPanel";
import { setFavoriteConversationIds } from "../../features/chatSlice";

export default function Sidebar({ onlineUsers, typing }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const {
    unreadByConversation,
    favoriteConversationIds,
    conversations,
    activeConversation,
  } = useSelector((state) => state.chat);
  const [searchResults, setSearchResults] = useState([]);
  const [activeView, setActiveView] = useState("all");

  const unreadChatsCount = conversations.reduce((count, conversation) => {
    const unreadCount = unreadByConversation[conversation._id] || 0;
    return count + (unreadCount > 0 ? 1 : 0);
  }, 0);

  const favoritesCount = favoriteConversationIds.length;

  useEffect(() => {
    const key = `favorites:${user._id}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      dispatch(setFavoriteConversationIds(Array.isArray(stored) ? stored : []));
    } catch {
      dispatch(setFavoriteConversationIds([]));
    }
  }, [dispatch, user._id]);

  useEffect(() => {
    const key = `favorites:${user._id}`;
    localStorage.setItem(key, JSON.stringify(favoriteConversationIds));
  }, [favoriteConversationIds, user._id]);

  return (
    <div className="w-full h-full flex select-none border-r dark:border-r-dark_border_2 bg-[#111b21]">
      <aside className="w-[58px] dark:bg-[#101418] border-r dark:border-r-[#252d32] flex flex-col items-center justify-between py-2">
        <div className="w-full flex flex-col items-center gap-2">
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              activeView !== "status" ? "bg-[#1f2c34]" : "hover:dark:bg-dark_hover_1"
            }`}
            onClick={() => setActiveView("all")}
          >
            <ChatIcon
              className={activeView !== "status" ? "dark:fill-green_1" : "dark:fill-dark_svg_2"}
            />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1">
            <CallIcon className="dark:fill-dark_svg_2" />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1">
            <NotificationIcon className="dark:fill-dark_svg_2" />
          </button>
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1 ${
              activeView === "status" ? "bg-[#1f2c34]" : ""
            }`}
            onClick={() => setActiveView("status")}
          >
            <StoryIcon className="dark:fill-dark_svg_2" />
          </button>
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1 ${
              activeView === "groups" ? "bg-[#1f2c34]" : ""
            }`}
            onClick={() => setActiveView("groups")}
          >
            <CommunityIcon className="dark:fill-dark_svg_2" />
          </button>
        </div>
        <button
          className="w-10 h-10 rounded-full overflow-hidden"
          onClick={() => navigate("/settings")}
          title="Profile settings"
        >
          <img
            src={user.picture || getTwoLetterAvatarUrl(user.name)}
            alt={user.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTwoLetterAvatarUrl(user.name);
            }}
            className="w-full h-full object-cover"
          />
        </button>
      </aside>

      <section className="flex-1 w-full min-w-0 md:max-w-[360px] dark:bg-[#111b21] overflow-hidden">
        {/*Sidebar Header*/}
        <SidebarHeader />

        {activeView === "status" ? (
          <StatusPanel embedded onCloseEmbedded={() => setActiveView("all")} />
        ) : (
          <>
            {/*Search*/}
            <Search
              searchLength={searchResults.length}
              setSearchResults={setSearchResults}
              activeView={activeView}
              setActiveView={setActiveView}
              unreadChatsCount={unreadChatsCount}
              favoritesCount={favoritesCount}
            />
            {searchResults.length > 0 ? (
              <SearchResults
                searchResults={searchResults}
                setSearchResults={setSearchResults}
              />
            ) : (
              <Conversations
                onlineUsers={onlineUsers}
                typing={typing}
                activeView={activeView}
                favoriteConversationIds={favoriteConversationIds}
                unreadByConversation={unreadByConversation}
                activeConversationId={activeConversation?._id}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
