import axios from "axios";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../../features/userSlice";
import { CloseIcon } from "../../../svg";
import {
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../../../utils/chat";
import { setActiveConversation } from "../../../features/chatSlice";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

export default function ContactInfoDrawer({ activeConversation, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const [busy, setBusy] = useState(false);

  if (!activeConversation?._id) return null;

  const isGroup = activeConversation?.isGroup;
  const targetId = isGroup
    ? ""
    : getConversationId(user, activeConversation.users || []);
  const title = isGroup
    ? activeConversation.name
    : getConversationName(user, activeConversation.users || []);
  const picture = isGroup
    ? activeConversation.picture
    : getConversationPicture(user, activeConversation.users || []);
  const phone = isGroup
    ? ""
    : (activeConversation.users || []).find((u) => u._id !== user._id)?.phone;
  const status = isGroup
    ? ""
    : (activeConversation.users || []).find((u) => u._id !== user._id)?.status;

  // Check if user is blocked
  const isUserBlocked = !isGroup && user.blockedUsers?.includes(targetId);

  const blockUser = async () => {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/user/block`,
        { userId: targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update Redux state with the updated blocked users list from server
      if (data.user) {
        dispatch(setUser({ blockedUsers: data.user.blockedUsers }));
      }
      alert(`Blocked ${title}`);
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to block user.");
    } finally {
      setBusy(false);
    }
  };

  const unblockUser = async () => {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/user/unblock`,
        { userId: targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update Redux state with the updated blocked users list from server
      if (data.user) {
        dispatch(setUser({ blockedUsers: data.user.blockedUsers }));
      }
      alert(`Unblocked ${title}`);
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to unblock user.");
    } finally {
      setBusy(false);
    }
  };

  const clearChat = async () => {
    if (busy || !window.confirm("Are you sure you want to clear this chat?")) return;
    setBusy(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/conversation/clear`,
        { conversationId: activeConversation._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Chat cleared successfully");
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to clear chat.");
    } finally {
      setBusy(false);
    }
  };

  const deleteChat = async () => {
    if (busy || !window.confirm("Are you sure you want to delete this chat?")) return;
    setBusy(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/conversation/delete`,
        { conversationId: activeConversation._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setActiveConversation(null));
      alert("Chat deleted successfully");
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to delete chat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-full sm:w-[420px] max-w-full dark:bg-dark_bg_2 border-l dark:border-l-dark_border_2 z-50 flex flex-col">
      <div className="h-[59px] px-4 dark:bg-dark_bg_2 flex items-center gap-4 border-b dark:border-b-dark_border_2">
        <button className="btn" onClick={onClose}>
          <CloseIcon className="fill-dark_svg_1" />
        </button>
        <h2 className="dark:text-dark_text_1 text-lg font-medium">Contact info</h2>
      </div>

      <div className="overflow-y-auto scrollbar flex-1">
        <div className="dark:bg-dark_bg_1 p-6 sm:p-8 flex flex-col items-center border-b dark:border-b-dark_border_2">
          <img
            src={picture || getTwoLetterAvatarUrl(title)}
            alt={title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTwoLetterAvatarUrl(title);
            }}
            className="w-32 sm:w-44 h-32 sm:h-44 rounded-full object-cover mb-5"
          />
          <h3 className="dark:text-dark_text_1 text-xl sm:text-[32px] leading-6 sm:leading-10 font-light text-center">
            {title}
          </h3>
          {!isGroup && (
            <p className="dark:text-dark_text_2 text-base sm:text-lg mt-2 text-center">{phone || ""}</p>
          )}
        </div>

        {!isGroup && (
          <div className="dark:bg-dark_bg_1 mt-2 p-4 sm:p-5 border-b dark:border-b-dark_border_2">
            <p className="text-xs sm:text-sm dark:text-dark_text_2 mb-2">About</p>
            <p className="dark:text-dark_text_1 text-sm">{status || "Hey there! I am using WhatsApp."}</p>
          </div>
        )}

        <div className="dark:bg-dark_bg_1 mt-2 py-2">
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 dark:text-dark_text_1 disabled:opacity-50 text-sm sm:text-base"
            disabled={busy}
          >
            Add to favourites
          </button>
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 dark:text-dark_text_1 disabled:opacity-50 text-sm sm:text-base"
            onClick={clearChat}
            disabled={busy}
          >
            {busy ? "Clearing..." : "Clear chat"}
          </button>
          {!isGroup && !isUserBlocked && (
            <button
              className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] disabled:opacity-50 text-sm sm:text-base font-medium"
              onClick={blockUser}
              disabled={busy}
            >
              {busy ? "Blocking..." : `🚫 Block ${title}`}
            </button>
          )}
          {!isGroup && isUserBlocked && (
            <button
              className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-green_1 disabled:opacity-50 text-sm sm:text-base font-medium"
              onClick={unblockUser}
              disabled={busy}
            >
              {busy ? "Unblocking..." : `✓ Unblock ${title}`}
            </button>
          )}
          {!isGroup && (
            <button className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] text-sm sm:text-base">
              {`Report ${title}`}
            </button>
          )}
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] disabled:opacity-50 text-sm sm:text-base"
            onClick={deleteChat}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete chat"}
          </button>
        </div>
      </div>
    </aside>
  );
}
