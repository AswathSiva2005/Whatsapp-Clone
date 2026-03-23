import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import moment from "moment";
import { ReturnIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import { setUser } from "../../../features/userSlice";

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
  } catch {
    return "";
  }
};

export default function StarredMessagesPanel({ setShowStarredMessages }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStarredMessages = async () => {
      setLoading(true);
      try {
        const API_ENDPOINT = resolveApiEndpoint();
        const token = user?.token || getPersistedToken();

        const getStarred = (tokenValue) =>
          axios.get(`${API_ENDPOINT}/message/starred`, {
            headers: {
              Authorization: `Bearer ${tokenValue}`,
            },
          });

        let response;
        try {
          response = await getStarred(token);
        } catch (error) {
          if (error?.response?.status !== 401) {
            throw error;
          }

          const refresh = await axios.post(
            `${API_ENDPOINT}/auth/refreshtoken`,
            {},
            { withCredentials: true }
          );

          const refreshedToken = refresh?.data?.user?.token;
          if (!refreshedToken) {
            throw error;
          }

          dispatch(setUser({ token: refreshedToken }));
          response = await getStarred(refreshedToken);
        }

        const { data } = response;
        setMessages(data || []);
      } catch (error) {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadStarredMessages();
  }, [dispatch, user.token]);

  return (
    <div className="fixed inset-0 z-50 bg-dark_bg_2 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          className="btn w-6 h-6 border"
          onClick={() => setShowStarredMessages(false)}
        >
          <ReturnIcon className="fill-white" />
        </button>
        <h2 className="text-lg font-semibold dark:text-dark_text_1">Starred messages</h2>
      </div>

      {loading ? (
        <p className="dark:text-dark_text_2">Loading starred messages...</p>
      ) : messages.length === 0 ? (
        <p className="dark:text-dark_text_2">No starred messages yet.</p>
      ) : (
        <div className="space-y-3 max-h-[80vh] overflow-y-auto scrollbar pr-2">
          {messages.map((message) => (
            <div key={message._id} className="dark:bg-dark_bg_3 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={message.sender?.picture || getTwoLetterAvatarUrl(message.sender?.name)}
                  alt={message.sender?.name || "User"}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getTwoLetterAvatarUrl(message.sender?.name || "User");
                  }}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="dark:text-dark_text_1 text-sm font-medium">
                    {message.sender?.name || "Unknown user"}
                  </p>
                  <p className="dark:text-dark_text_2 text-xs">
                    {message.conversation?.isGroup
                      ? message.conversation?.name || "Group"
                      : "Direct chat"}
                  </p>
                </div>
              </div>
              <p className="dark:text-dark_text_1 text-sm break-words">{message.message || "(file message)"}</p>
              <p className="dark:text-dark_text_2 text-xs mt-2">{moment(message.createdAt).format("DD/MM/YYYY HH:mm")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
