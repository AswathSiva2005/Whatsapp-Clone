import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function CallHistoryPanel({ callHistory = [], loading = false, onCallDeleted }) {
  const { user } = useSelector((state) => state.user);
  const [deleting, setDeleting] = useState(null);

  const handleDeleteCall = async (callId) => {
    if (!window.confirm("Delete this call from history?")) return;
    
    setDeleting(callId);
    try {
      await axios.delete(
        `${resolveApiEndpoint()}/call/${callId}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      // Notify parent to refresh call history
      if (onCallDeleted) onCallDeleted(callId);
    } catch (error) {
      console.error("Failed to delete call:", error);
      alert("Failed to delete call history");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL call history? This cannot be undone.")) return;
    
    try {
      setDeleting("all");
      for (const call of callHistory) {
        await axios.delete(
          `${resolveApiEndpoint()}/call/${call._id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
      }
      // Notify parent to refresh the entire call history
      callHistory.forEach((call) => {
        if (onCallDeleted) onCallDeleted(call._id);
      });
      alert("All call history deleted successfully");
    } catch (error) {
      console.error("Failed to delete all calls:", error);
      alert("Failed to delete all call history");
    } finally {
      setDeleting(null);
    }
  };

  const normalized = useMemo(() => {
    return (callHistory || []).map((call) => {
      const isCaller = String(call?.caller?._id) === String(user._id);
      const other = isCaller ? call?.receiver : call?.caller;

      return {
        id: call?._id,
        name: other?.name || call?.conversation?.name || "Unknown",
        picture: other?.picture || "",
        callType: call?.type || "voice",
        status: call?.status || "completed",
        createdAt: call?.createdAt,
        isCaller,
      };
    });
  }, [callHistory, user._id]);

  return (
    <div className="h-[calc(100vh-126px)] overflow-y-auto scrollbar px-2 py-2">
      <div className="flex items-center justify-between px-2 pb-2">
        <h3 className="text-sm text-green_1 font-semibold">Recent calls</h3>
        {!loading && normalized.length > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={deleting === "all"}
            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:dark:bg-dark_hover_1 disabled:opacity-50"
            title="Delete all call history"
          >
            Delete All
          </button>
        )}
      </div>

      {loading ? <p className="px-2 text-sm dark:text-dark_text_2">Loading calls...</p> : null}

      {!loading && normalized.length === 0 ? (
        <p className="px-2 text-sm dark:text-dark_text_2">No call history yet.</p>
      ) : null}

      <ul className="space-y-1">
        {normalized.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg px-2 py-2 hover:dark:bg-dark_hover_1 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={entry.picture || getTwoLetterAvatarUrl(entry.name)}
                alt={entry.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getTwoLetterAvatarUrl(entry.name);
                }}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm dark:text-dark_text_1 truncate">{entry.name}</p>
                <p className="text-xs dark:text-dark_text_2 truncate">
                  {entry.callType === "video" ? "Video" : "Voice"} • {entry.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs dark:text-dark_text_2">{formatDate(entry.createdAt)}</p>
                <p className="text-[11px] dark:text-dark_text_2">
                  {entry.isCaller ? "Outgoing" : "Incoming"}
                </p>
              </div>
              <button
                onClick={() => handleDeleteCall(entry.id)}
                disabled={deleting === entry.id}
                className="ml-2 px-2 py-1 text-red-400 hover:text-red-600 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Delete call"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
