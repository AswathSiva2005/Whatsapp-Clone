import { useEffect, useState } from "react";
import { Conversations } from "./conversations";
import { SidebarHeader } from "./header";
import { Search } from "./search";
import { SearchResults } from "./search";
import {
  ArchiveIcon,
  CallIcon,
  ChatIcon,
  CommunityIcon,
  NotificationIcon,
  StoryIcon,
} from "../../svg";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getTwoLetterAvatarUrl } from "../../utils/avatar";
import StatusPanel from "./header/StatusPanel";
import {
  setArchivedConversationIds,
  setPinnedConversationIds,
} from "../../features/chatSlice";
import CallHistoryPanel from "./calls/CallHistoryPanel";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const API_ENDPOINT = resolveApiEndpoint();

export default function Sidebar({ onlineUsers, typing }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const {
    unreadByConversation,
    pinnedConversationIds,
    archivedConversationIds,
    conversations,
    activeConversation,
  } = useSelector((state) => state.chat);
  const [searchResults, setSearchResults] = useState([]);
  const [activeView, setActiveView] = useState("all");
  const [callHistory, setCallHistory] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);

  const unreadChatsCount = conversations.reduce((count, conversation) => {
    const unreadCount = unreadByConversation[conversation._id] || 0;
    return count + (unreadCount > 0 ? 1 : 0);
  }, 0);

  const pinnedCount = pinnedConversationIds.length;
  const archivedCount = archivedConversationIds.length;
  const mutedConversationIds = user?.notificationSettings?.mutedConversations || [];

  useEffect(() => {
    const pinnedKey = `pinned:${user._id}`;
    const archivedKey = `archived:${user._id}`;
    try {
      const storedPinned = JSON.parse(localStorage.getItem(pinnedKey) || "[]");
      const storedArchived = JSON.parse(localStorage.getItem(archivedKey) || "[]");
      dispatch(setPinnedConversationIds(Array.isArray(storedPinned) ? storedPinned : []));
      dispatch(
        setArchivedConversationIds(Array.isArray(storedArchived) ? storedArchived : [])
      );
    } catch {
      dispatch(setPinnedConversationIds([]));
      dispatch(setArchivedConversationIds([]));
    }
  }, [dispatch, user._id]);

  useEffect(() => {
    localStorage.setItem(`pinned:${user._id}`, JSON.stringify(pinnedConversationIds));
  }, [pinnedConversationIds, user._id]);

  useEffect(() => {
    localStorage.setItem(`archived:${user._id}`, JSON.stringify(archivedConversationIds));
  }, [archivedConversationIds, user._id]);

  const handleCallDeleted = (deletedCallId) => {
    setCallHistory((prevHistory) =>
      prevHistory.filter((call) => call._id !== deletedCallId)
    );
  };

  useEffect(() => {
    if (activeView !== "calls" || !user?.token) return;

    let cancelled = false;
    const loadCalls = async () => {
      setCallsLoading(true);
      try {
        const { data } = await axios.get(`${API_ENDPOINT}/call`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        if (!cancelled) {
          setCallHistory(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setCallHistory([]);
        }
      } finally {
        if (!cancelled) {
          setCallsLoading(false);
        }
      }
    };

    loadCalls();
    return () => {
      cancelled = true;
    };
  }, [activeView, user?.token]);

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
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1 ${
              activeView === "calls" ? "bg-[#1f2c34]" : ""
            }`}
            onClick={() => setActiveView("calls")}
          >
            <CallIcon className="dark:fill-dark_svg_2" />
          </button>
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1 ${
              activeView === "archived" ? "bg-[#1f2c34]" : ""
            }`}
            onClick={() => setActiveView("archived")}
            title="Archived chats"
          >
            <ArchiveIcon className="dark:fill-dark_svg_2" />
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
        ) : activeView === "calls" ? (
          <CallHistoryPanel 
            callHistory={callHistory} 
            loading={callsLoading} 
            onCallDeleted={handleCallDeleted}
          />
        ) : (
          <>
            {/*Search*/}
            <Search
              searchLength={searchResults.length}
              setSearchResults={setSearchResults}
              activeView={activeView}
              setActiveView={setActiveView}
              unreadChatsCount={unreadChatsCount}
              pinnedCount={pinnedCount}
              archivedCount={archivedCount}
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
                pinnedConversationIds={pinnedConversationIds}
                archivedConversationIds={archivedConversationIds}
                mutedConversationIds={mutedConversationIds}
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
