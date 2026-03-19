import moment from "moment";
import axios from "axios";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import TraingleIcon from "../../../svg/triangle";
import { SingleTickIcon, SeenIcon } from "../../../svg";
import {
  removeMessageById,
  toggleMessageStarred,
} from "../../../features/chatSlice";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

export default function Message({ message, me, highlights = [] }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [showActions, setShowActions] = useState(false);
  const isStarred = (message.starredBy || []).some(
    (id) => String(id) === String(user._id)
  );

  const toggleStarMessage = async () => {
    const confirmText = isStarred
      ? "Remove this message from Starred Messages?"
      : "Add this message to Starred Messages?";

    if (!window.confirm(confirmText)) {
      setShowActions(false);
      return;
    }

    try {
      const { data } = await axios.patch(
        `${process.env.REACT_APP_API_ENDPOINT}/message/${message._id}/star`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
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
      await axios.delete(
        `${process.env.REACT_APP_API_ENDPOINT}/message/${message._id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
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
      const { data } = await axios.patch(
        `${process.env.REACT_APP_API_ENDPOINT}/message/${message._id}/delete-for-everyone`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      // Update the message in Redux with the deleted version
      dispatch(
        toggleMessageStarred({
          messageId: message._id,
          starred: false,
        })
      );
    } catch (error) {
      alert("Failed to delete message for everyone. Only the sender can delete for everyone.");
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
          onClick={() => setShowActions((prev) => !prev)}
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
            <div className="absolute right-0 -top-28 dark:bg-dark_bg_2 border dark:border-dark_border_2 rounded-md shadow-md z-40 min-w-[170px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:dark:bg-dark_bg_3"
                onClick={toggleStarMessage}
              >
                {isStarred ? "Unstar message" : "Star message"}
              </button>
              {me && !message.isDeletedForEveryone && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:dark:bg-dark_bg_3"
                  onClick={deleteMessageForEveryone}
                >
                  Delete for everyone
                </button>
              )}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-[#f15c6d] hover:dark:bg-dark_bg_3"
                onClick={deleteMessage}
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
