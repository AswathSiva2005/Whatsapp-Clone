import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { CloseIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

const STATUS_DURATION_MS = 10000;

export default function StatusViewer({
  statuses,
  initialIndex,
  onClose,
  onStatusUpdated,
}) {
  const { user } = useSelector((state) => state.user);
  const [index, setIndex] = useState(initialIndex || 0);
  const [elapsed, setElapsed] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const activeStatus = statuses[index];
  const progress = Math.min((elapsed / STATUS_DURATION_MS) * 100, 100);
  const isMine = String(activeStatus?.user?._id) === String(user._id);

  useEffect(() => {
    setElapsed(0);
    setReplyText("");
  }, [index]);

  useEffect(() => {
    if (!activeStatus?._id) return;

    if (!isMine) {
      axios
        .post(
          `${process.env.REACT_APP_API_ENDPOINT}/status/${activeStatus._id}/view`,
          {},
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        )
        .catch(() => {});
    }
  }, [activeStatus?._id, isMine, user.token]);

  useEffect(() => {
    if (!activeStatus?._id) return;

    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 100;
        if (next >= STATUS_DURATION_MS) {
          if (index < statuses.length - 1) {
            setIndex((old) => old + 1);
            return 0;
          }
          onClose();
          return prev;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [index, statuses.length, activeStatus?._id, onClose]);

  const likesCount = useMemo(() => {
    if (!activeStatus?.likes) return 0;
    return activeStatus.likes.length;
  }, [activeStatus]);

  const isLikedByMe = useMemo(() => {
    return (activeStatus?.likes || []).some(
      (id) => String(id) === String(user._id)
    );
  }, [activeStatus?.likes, user._id]);

  const toggleLike = async () => {
    if (!activeStatus?._id || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.patch(
        `${process.env.REACT_APP_API_ENDPOINT}/status/${activeStatus._id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      onStatusUpdated(activeStatus._id, {
        liked: data.liked,
        userId: user._id,
      });
    } catch (error) {
      // no-op
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!activeStatus?._id || !replyText.trim() || busy) return;
    setBusy(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/status/${activeStatus._id}/reply`,
        { text: replyText.trim() },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      setReplyText("");
      alert("Reply sent.");
    } catch (error) {
      alert("Failed to send reply.");
    } finally {
      setBusy(false);
    }
  };

  if (!activeStatus) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[78vh] rounded-xl overflow-hidden bg-dark_bg_2 relative border dark:border-dark_border_2">
        <div className="absolute top-0 left-0 w-full p-3 z-20">
          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <img
                src={activeStatus.user?.picture || getTwoLetterAvatarUrl(activeStatus.user?.name)}
                alt={activeStatus.user?.name || "User"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getTwoLetterAvatarUrl(activeStatus.user?.name);
                }}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-white text-sm">{activeStatus.user?.name}</span>
            </div>
            <button className="btn" onClick={onClose}>
              <CloseIcon className="fill-white" />
            </button>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center px-6 text-center">
          {activeStatus.mediaType === "image" && activeStatus.mediaUrl ? (
            <img
              src={activeStatus.mediaUrl}
              alt="status"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="text-white text-2xl leading-relaxed break-words">
              {activeStatus.text || "Status"}
            </p>
          )}
        </div>

        <button
          className="absolute left-1 top-1/2 -translate-y-1/2 text-white/80 text-2xl px-3"
          onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
          disabled={index === 0}
        >
          ‹
        </button>
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 text-white/80 text-2xl px-3"
          onClick={() => {
            if (index < statuses.length - 1) setIndex((prev) => prev + 1);
            else onClose();
          }}
        >
          ›
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/45">
          <div className="flex items-center justify-between text-white text-xs mb-2">
            <span>Likes: {likesCount}</span>
            {!isMine && (
              <button
                className={`px-3 py-1 rounded ${isLikedByMe ? "bg-green_1" : "bg-dark_bg_3"}`}
                onClick={toggleLike}
                disabled={busy}
              >
                {isLikedByMe ? "Liked" : "Like"}
              </button>
            )}
          </div>
          {!isMine && (
            <div className="flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status"
                className="input"
              />
              <button
                className="px-3 py-2 rounded bg-green_1 text-white text-sm"
                onClick={sendReply}
                disabled={busy || !replyText.trim()}
              >
                Reply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
