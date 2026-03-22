import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import moment from "moment";
import { CloseIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import { resolveApiEndpoint, resolveMediaUrl } from "../../../utils/mediaUrl";
import StatusViewer from "./StatusViewer";

const API_ENDPOINT = resolveApiEndpoint();

export default function StatusPanel({
  setShowStatusPanel,
  embedded = false,
  onCloseEmbedded,
}) {
  const { user } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [statusFeed, setStatusFeed] = useState({ mine: [], feed: [] });
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewerState, setViewerState] = useState({
    open: false,
    statuses: [],
    initialIndex: 0,
  });
  const [likersModal, setLikersModal] = useState({ open: false, users: [] });

  const fetchStatuses = useCallback(async () => {
    if (!user?.token) {
      setStatusFeed({ mine: [], feed: [] });
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get(`${API_ENDPOINT}/status`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setStatusFeed(data || { mine: [], feed: [] });
    } catch (error) {
      setStatusFeed({ mine: [], feed: [] });
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const canSubmit = useMemo(() => {
    return Boolean(text.trim() || imageFile);
  }, [text, imageFile]);

  const onPickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const createStatus = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      let mediaUrl = "";
      let mediaType = "text";

      if (!user?.token) {
        alert("Please login again.");
        return;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await axios.post(
          `${API_ENDPOINT}/user/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        mediaUrl =
          uploadResponse?.data?.secure_url ||
          uploadResponse?.data?.url ||
          "";
        mediaType = "image";
      }

      await axios.post(
        `${API_ENDPOINT}/status`,
        {
          text: text.trim(),
          mediaUrl,
          mediaType,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setText("");
      setImageFile(null);
      setImagePreview("");
      await fetchStatuses();
    } catch (error) {
      alert("Failed to add status.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStatus = async (statusId) => {
    if (!window.confirm("Delete this status?")) return;
    if (!user?.token) {
      alert("Please login again.");
      return;
    }

    try {
      await axios.delete(`${API_ENDPOINT}/status/${statusId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      setStatusFeed((prev) => ({
        ...prev,
        mine: prev.mine.filter((status) => status._id !== statusId),
      }));
    } catch (error) {
      alert("Failed to delete status.");
    }
  };

  const openViewer = (statuses, initialIndex = 0) => {
    if (!statuses?.length) return;
    setViewerState({
      open: true,
      statuses,
      initialIndex,
    });
  };

  const updateStatusLikeInState = (statusId, payload) => {
    const updater = (status) => {
      if (status._id !== statusId) return status;

      const currentLikes = Array.isArray(status.likes) ? [...status.likes] : [];
      const exists = currentLikes.some((id) => String(id) === String(payload.userId));

      if (payload.liked && !exists) {
        currentLikes.push(payload.userId);
      }
      if (!payload.liked && exists) {
        status.likes = currentLikes.filter(
          (id) => String(id) !== String(payload.userId)
        );
        return { ...status };
      }

      return {
        ...status,
        likes: currentLikes,
      };
    };

    setStatusFeed((prev) => ({
      mine: prev.mine.map(updater),
      feed: prev.feed.map((group) => ({
        ...group,
        statuses: group.statuses.map(updater),
      })),
    }));

    setViewerState((prev) => ({
      ...prev,
      statuses: prev.statuses.map(updater),
    }));
  };

  const getLikedUsers = (status) => {
    if (!Array.isArray(status?.likesDetailed)) return [];
    return status.likesDetailed;
  };

  return (
    <>
      <div
        className={`${
          embedded
            ? "h-[calc(100vh-58px)] overflow-y-auto scrollbar p-4"
            : "fixed inset-0 z-[80] bg-dark_bg_2 p-4 overflow-y-auto scrollbar"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl dark:text-dark_text_1 font-semibold">Status</h2>
          <button
            className="btn"
            onClick={() => {
              if (embedded) {
                onCloseEmbedded?.();
              } else {
                setShowStatusPanel(false);
              }
            }}
          >
            <CloseIcon className="fill-dark_svg_1" />
          </button>
        </div>

        <div className="dark:bg-dark_bg_3 p-4 rounded-lg mb-4">
          <p className="text-sm dark:text-dark_text_2 mb-2">Add new status</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows="3"
            maxLength={300}
            className="w-full bg-transparent border dark:border-dark_border_2 rounded-md p-2 dark:text-dark_text_1 outline-none"
            placeholder="Type your status"
          />
          <div className="flex items-center justify-between mt-3 gap-3">
            <label className="text-sm text-green_1 cursor-pointer hover:underline">
              Add image
              <input className="hidden" type="file" accept="image/*" onChange={onPickImage} />
            </label>
            <button
              className="px-4 py-2 rounded bg-green_1 text-white disabled:opacity-50"
              onClick={createStatus}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Posting..." : "Post status"}
            </button>
          </div>
          {imagePreview && (
            <div className="mt-3">
              <img src={imagePreview} alt="preview" className="w-28 h-28 object-cover rounded" />
            </div>
          )}
        </div>

        <div className="dark:bg-dark_bg_3 p-4 rounded-lg mb-4">
          <h3 className="dark:text-dark_text_1 font-medium mb-3">My status</h3>
          {statusFeed.mine.length === 0 ? (
            <p className="dark:text-dark_text_2 text-sm">No active status. Status auto-deletes in 24 hours after posting.</p>
          ) : (
            <div className="space-y-2">
              {statusFeed.mine.map((status, idx) => (
                <div key={status._id} className="dark:bg-dark_bg_2 rounded-md p-2">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      className="text-left flex-1 flex items-center gap-3"
                      onClick={() => openViewer(statusFeed.mine, idx)}
                    >
                      {status.mediaType === "image" && status.mediaUrl ? (
                        <img
                          src={resolveMediaUrl(status.mediaUrl)}
                          alt="status"
                          className="w-12 h-12 rounded-md object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getTwoLetterAvatarUrl("Status");
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-dark_bg_3 flex items-center justify-center text-white text-xs px-1 text-center">
                          {status.text ? "Text" : "Status"}
                        </div>
                      )}
                      <div>
                        <p className="dark:text-dark_text_1 text-sm">
                          {status.text || "Image status"}
                        </p>
                        <p className="dark:text-dark_text_2 text-xs">
                          {moment(status.createdAt).fromNow()}
                        </p>
                      </div>
                    </button>
                    <button
                      className="text-xs text-[#f15c6d] px-2 py-1"
                      onClick={() => deleteStatus(status._id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-start">
                    <button
                      className="text-xs dark:text-dark_text_1 px-2 py-1 rounded-full bg-dark_bg_3 flex items-center gap-2"
                      onClick={() =>
                        setLikersModal({
                          open: true,
                          users: getLikedUsers(status),
                        })
                      }
                    >
                      <span>♡</span>
                      <span>{Array.isArray(status.likes) ? status.likes.length : 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dark:bg-dark_bg_3 p-4 rounded-lg">
          <h3 className="dark:text-dark_text_1 font-medium mb-3">Recent updates</h3>
          {loading ? (
            <p className="dark:text-dark_text_2 text-sm">Loading statuses...</p>
          ) : statusFeed.feed.length === 0 ? (
            <p className="dark:text-dark_text_2 text-sm">No statuses from contacts.</p>
          ) : (
            <div className="space-y-2">
              {statusFeed.feed.map((group) => (
                <button
                  key={group.user._id}
                  className="w-full text-left flex items-center gap-3 dark:bg-dark_bg_2 rounded-md p-2"
                  onClick={() => openViewer(group.statuses, 0)}
                >
                  <img
                    src={group.user.picture || getTwoLetterAvatarUrl(group.user.name)}
                    alt={group.user.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getTwoLetterAvatarUrl(group.user.name);
                    }}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="dark:text-dark_text_1 text-sm font-medium">{group.user.name}</p>
                    <p className="dark:text-dark_text_2 text-xs">
                      {group.statuses.length} status update{group.statuses.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewerState.open && (
        <StatusViewer
          statuses={viewerState.statuses}
          initialIndex={viewerState.initialIndex}
          onClose={() => setViewerState({ open: false, statuses: [], initialIndex: 0 })}
          onStatusUpdated={updateStatusLikeInState}
        />
      )}

      {likersModal.open && (
        <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark_bg_2 border dark:border-dark_border_2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm dark:text-dark_text_1 font-semibold">Liked by</h3>
              <button className="btn" onClick={() => setLikersModal({ open: false, users: [] })}>
                <CloseIcon className="fill-dark_svg_1" />
              </button>
            </div>
            {likersModal.users.length === 0 ? (
              <p className="text-sm dark:text-dark_text_2">No likes yet.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {likersModal.users.map((likedUser) => (
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
    </>
  );
}
