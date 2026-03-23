import moment from "moment";
import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import TraingleIcon from "../../../svg/triangle";
import { SingleTickIcon, SeenIcon } from "../../../svg";
import {
  removeMessageById,
  toggleMessageStarred,
} from "../../../features/chatSlice";
import { setUser } from "../../../features/userSlice";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const getPersistedToken = () => {
  try {
    const persistedRoot = sessionStorage.getItem("persist:user");
    if (!persistedRoot) return "";

    const parsedRoot = JSON.parse(persistedRoot);
    if (!parsedRoot?.user) return "";

    const parsedUserSlice = JSON.parse(parsedRoot.user);
    return parsedUserSlice?.user?.token || "";
  } catch (error) {
    return "";
  }
};

export default function Message({ message, me, highlights = [] }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const API_ENDPOINT = resolveApiEndpoint();
  const authToken = user?.token || getPersistedToken();
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef(null);
  const menuRef = useRef(null);
  const isStarred = (message.starredBy || []).some(
    (id) => String(id) === String(user._id)
  );

  const getAuthHeaders = (tokenValue) => ({
    headers: {
      Authorization: `Bearer ${tokenValue}`,
    },
  });

  const runWithAuthRetry = async (requestFactory) => {
    const firstToken = authToken;

    try {
      return await requestFactory(firstToken);
    } catch (error) {
      if (error?.response?.status !== 401) {
        throw error;
      }

      const refreshResponse = await axios.post(
        `${API_ENDPOINT}/auth/refreshtoken`,
        {},
        { withCredentials: true }
      );

      const refreshedToken = refreshResponse?.data?.user?.token;
      if (!refreshedToken) {
        throw error;
      }

      dispatch(setUser({ token: refreshedToken }));
      return await requestFactory(refreshedToken);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleMessageClick = (e) => {
    e.stopPropagation();
    if (!showActions) {
      window.dispatchEvent(
        new CustomEvent("message-menu-open", {
          detail: { messageId: message._id },
        })
      );
    }
    setShowActions((prev) => !prev);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
  };

  // Close this menu when another message menu is opened
  useEffect(() => {
    const handleAnotherMenuOpen = (event) => {
      if (event.detail?.messageId !== message._id) {
        setShowActions(false);
      }
    };

    window.addEventListener("message-menu-open", handleAnotherMenuOpen);
    return () => {
      window.removeEventListener("message-menu-open", handleAnotherMenuOpen);
    };
  }, [message._id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showActions) {
        return;
      }

      const thisMessageContainer = event.target.closest(
        `[data-message-id="${message._id}"]`
      );

      if (!thisMessageContainer && menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [message._id, showActions]);

  const toggleStarMessage = async () => {
    const confirmText = isStarred
      ? "Remove this message from Starred Messages?"
      : "Add this message to Starred Messages?";

    if (!window.confirm(confirmText)) {
      setShowActions(false);
      return;
    }

    try {
      const { data } = await runWithAuthRetry((tokenValue) =>
        axios.patch(
          `${API_ENDPOINT}/message/${message._id}/star`,
          {},
          getAuthHeaders(tokenValue)
        )
      );
      dispatch(
        toggleMessageStarred({
          messageId: message._id,
          userId: user._id,
          starred: data.starred,
        })
      );
    } catch (error) {
      // no-op UI fallback
    } finally {
      setShowActions(false);
    }
  };

  const deleteMessage = async () => {
    if (!window.confirm("Delete this message only for you?")) {
      setShowActions(false);
      return;
    }

    try {
      await runWithAuthRetry((tokenValue) =>
        axios.delete(
          `${API_ENDPOINT}/message/${message._id}`,
          getAuthHeaders(tokenValue)
        )
      );
      dispatch(removeMessageById(message._id));
    } catch (error) {
      // no-op UI fallback
    } finally {
      setShowActions(false);
    }
  };

  const deleteMessageForEveryone = async () => {
    if (!window.confirm("Delete this message for everyone? They will see 'This message was deleted'")) {
      setShowActions(false);
      return;
    }

    try {
      const { data } = await runWithAuthRetry((tokenValue) =>
        axios.patch(
          `${API_ENDPOINT}/message/${message._id}/delete-for-everyone`,
          {},
          getAuthHeaders(tokenValue)
        )
      );
      // Update the message in Redux with the deleted version
      dispatch(
        toggleMessageStarred({
          messageId: message._id,
          starred: false,
        })
      );
    } catch (error) {
      const statusCode = error?.response?.status;
      if (statusCode === 401) {
        alert("Your session expired. Please login again.");
      } else if (statusCode === 403) {
        alert("Only the sender can delete for everyone.");
      } else {
        alert("Failed to delete message for everyone. Please try again.");
      }
    } finally {
      setShowActions(false);
    }
  };

  // Function to render text with highlights
  const renderHighlightedText = () => {
    if (!highlights || highlights.length === 0) {
      return message.message;
    }

    const text = message.message;
    const parts = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    sortedHighlights.forEach((highlight, idx) => {
      if (highlight.start > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, highlight.start),
          highlighted: false,
        });
      }
      parts.push({
        text: text.substring(highlight.start, highlight.end),
        highlighted: true,
      });
      lastIndex = highlight.end;
    });

    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        highlighted: false,
      });
    }

    return (
      <>
        {parts.map((part, idx) =>
          part.highlighted ? (
            <mark key={idx} className="bg-yellow-300 dark:bg-yellow-500 text-black px-0.5 rounded">
              {part.text}
            </mark>
          ) : (
            <span key={idx}>{part.text}</span>
          )
        )}
      </>
    );
  };

  return (
    <div
      className={`w-full flex mt-2 space-x-3 max-w-xs ${
        me ? "ml-auto justify-end " : ""
      }`}
      data-message-container
      data-message-id={message._id}
    >
      {/*Message Container*/}
      <div className="relative">
        {/* sender user message */}
        {!me && message.conversation.isGroup && (
          <div className="absolute top-0.5 left-[-37px]">
            <img
              src={message.sender.picture || getTwoLetterAvatarUrl(message.sender.name)}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getTwoLetterAvatarUrl(message.sender.name);
              }}
              className="w-8 h-8 rounded-full"
            />
          </div>
        )}
        <div
          className={`relative h-full dark:text-dark_text_1 p-2 rounded-lg
        ${me ? "bg-green_3" : "dark:bg-dark_bg_2"}
        `}
          onClick={handleMessageClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/*Message*/}
          <p className="float-left h-full text-sm pb-4 pr-8 break-words">
            {message.isDeletedForEveryone ? (
              <span className="italic text-dark_text_5">This message was deleted</span>
            ) : (
              renderHighlightedText()
            )}
          </p>
          {isStarred && (
            <span className="absolute right-12 bottom-1.5 text-xs text-yellow-300">
              ★
            </span>
          )}
          {/*Message Date*/}
          <span className="absolute right-6 bottom-1.5 text-xs text-dark_text_5 leading-none">
            {moment(message.createdAt).format("HH:mm")}
          </span>
          {/*Message Status Ticks*/}
          {me && (
            <span className="absolute right-0.5 bottom-1.5 flex items-center gap-0.5">
              {message.status === "read" ? (
                <SeenIcon className="fill-blue-500 w-4 h-4" />
              ) : message.status === "delivered" ? (
                <SeenIcon className="fill-dark_text_5 w-4 h-4" />
              ) : (
                <SingleTickIcon className="fill-dark_text_5 w-4 h-4" />
              )}
            </span>
          )}
          {/*Traingle*/}
          {!me ? (
            <span>
              <TraingleIcon className="dark:fill-dark_bg_2 rotate-[60deg] absolute top-[-5px] -left-1.5" />
            </span>
          ) : null}

          {showActions && (
            <div 
              ref={menuRef}
              onClick={handleMenuClick}
              className={`absolute top-full mt-1 dark:bg-dark_bg_2 border dark:border-dark_border_2 rounded-md shadow-lg z-50 min-w-[170px] ${
                me ? "right-0" : "left-0"
              }`}
            >
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:dark:bg-dark_bg_3"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStarMessage();
                }}
              >
                {isStarred ? "Unstar message" : "Star message"}
              </button>
              {me && !message.isDeletedForEveryone && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:dark:bg-dark_bg_3"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessageForEveryone();
                  }}
                >
                  Delete for everyone
                </button>
              )}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-[#f15c6d] hover:dark:bg-dark_bg_3"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMessage();
                }}
              >
                Delete message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
