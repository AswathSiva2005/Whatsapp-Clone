import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { CloseIcon, SendIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import { resolveApiEndpoint, resolveMediaUrl } from "../../../utils/mediaUrl";

const STATUS_DURATION_MS = 10000;

const API_ENDPOINT = resolveApiEndpoint();

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
  const [paused, setPaused] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState(false);

  const activeStatus = statuses[index];
  const progress = Math.min((elapsed / STATUS_DURATION_MS) * 100, 100);
  const isMine = String(activeStatus?.user?._id) === String(user._id);

  useEffect(() => {
    setElapsed(0);
    setReplyText("");
    setPaused(false);
    setShowLikers(false);
    setMediaLoadError(false);
  }, [index]);

  useEffect(() => {
    if (!activeStatus?._id || !user?.token) return;

    if (!isMine) {
      axios
        .post(
          `${API_ENDPOINT}/status/${activeStatus._id}/view`,
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
    if (paused) return;

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
  }, [index, statuses.length, activeStatus?._id, onClose, paused]);

  const likesCount = useMemo(() => {
    if (!activeStatus?.likes) return 0;
    return activeStatus.likes.length;
  }, [activeStatus]);

  const isLikedByMe = useMemo(() => {
    return (activeStatus?.likes || []).some(
      (id) => String(id) === String(user._id)
    );
  }, [activeStatus?.likes, user._id]);

  const likedUsers = useMemo(() => {
    if (!Array.isArray(activeStatus?.likesDetailed)) return [];
    return activeStatus.likesDetailed;
  }, [activeStatus?.likesDetailed]);

  const activeStatusMediaUrl = useMemo(() => {
    return resolveMediaUrl(activeStatus?.mediaUrl);
  }, [activeStatus?.mediaUrl]);

  const toggleLike = async () => {
    if (!activeStatus?._id || busy || !user?.token) return;
    setBusy(true);
    try {
      const { data } = await axios.patch(
        `${API_ENDPOINT}/status/${activeStatus._id}/like`,
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
    if (!activeStatus?._id || !replyText.trim() || busy || !user?.token) return;
    setBusy(true);
    try {
      await axios.post(
        `${API_ENDPOINT}/status/${activeStatus._id}/reply`,
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
    <div
      className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-[78vh] rounded-xl overflow-hidden bg-dark_bg_2 relative border dark:border-dark_border_2"
        onClick={(e) => e.stopPropagation()}
      >
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
          <button
            className="w-full h-full flex items-center justify-center px-0"
            onClick={() => setPaused((prev) => !prev)}
            title={paused ? "Resume" : "Pause"}
          >
            {activeStatus.mediaType === "image" && activeStatusMediaUrl && !mediaLoadError ? (
              <img
                src={activeStatusMediaUrl}
                alt="status"
                className="max-h-full max-w-full object-contain"
                onError={() => setMediaLoadError(true)}
              />
            ) : (
              <p className="text-white text-2xl leading-relaxed break-words">
                {activeStatus.text || "Status"}
              </p>
            )}
          </button>
        </div>

        {paused && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs text-white bg-black/55">
            Paused
          </div>
        )}

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
          {isMine ? (
            <div className="flex items-center justify-start">
              <button
                className="px-3 py-1 rounded-full bg-black/45 text-white text-xs flex items-center gap-2"
                onClick={() => setShowLikers(true)}
              >
                <span>♡</span>
                <span>{likesCount}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Reply to status"
                className="input"
              />
              <button
                className="w-10 h-10 rounded-full bg-dark_bg_3 flex items-center justify-center"
                onClick={sendReply}
                disabled={busy || !replyText.trim()}
                title="Reply"
              >
                <SendIcon className="fill-white" />
              </button>
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isLikedByMe ? "bg-green_1" : "bg-dark_bg_3"
                }`}
                onClick={toggleLike}
                disabled={busy}
                title={isLikedByMe ? "Unlike" : "Like"}
              >
                <span className="text-white text-lg leading-none">{isLikedByMe ? "♥" : "♡"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showLikers && isMine && (
        <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark_bg_2 border dark:border-dark_border_2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm dark:text-dark_text_1 font-semibold">Liked by</h3>
              <button className="btn" onClick={() => setShowLikers(false)}>
                <CloseIcon className="fill-dark_svg_1" />
              </button>
            </div>
            {likedUsers.length === 0 ? (
              <p className="text-sm dark:text-dark_text_2">No likes yet.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {likedUsers.map((likedUser) => (
                  <div
                    key={likedUser._id}
                    className="flex items-center gap-3 dark:bg-dark_bg_3 rounded-md p-2"
                  >
                    <img
                      src={likedUser.picture || getTwoLetterAvatarUrl(likedUser.name)}
                      alt={likedUser.name || "User"}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getTwoLetterAvatarUrl(likedUser.name);
                      }}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm dark:text-dark_text_1">{likedUser.name || "User"}</p>
                      <p className="text-xs dark:text-dark_text_2">{likedUser.status || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
