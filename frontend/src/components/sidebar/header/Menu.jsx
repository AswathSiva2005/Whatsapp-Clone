import { useDispatch } from "react-redux";
import { logout } from "../../../features/userSlice";
import { useSelector } from "react-redux";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

export default function Menu({
  setShowCreateGroup,
  setShowSettings,
  setShowStarredMessages,
  setShowMenu,
}) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const handleLogout = async () => {
    try {
      if (user?.token) {
        await axios.post(
          `${resolveApiEndpoint()}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
      }
    } catch {
      // local logout should still complete even if server call fails
    } finally {
      if (user?._id) {
        sessionStorage.removeItem(`appLockUnlocked:${user._id}`);
      }
      dispatch(logout());
      setShowMenu(false);
    }
  };
  return (
    <>
      <div className="absolute right-1 z-50 dark:bg-dark_bg_2 dark:text-dark_text_1 shadow-md w-52">
        <ul>
          <li
            className="py-3 pl-5 cursor-pointer hover:bg-dark_bg_3"
            onClick={() => {
              setShowCreateGroup(true);
              setShowMenu(false);
            }}
          >
            <span>New group</span>
          </li>
          <li className="py-3 pl-5 cursor-pointer hover:bg-dark_bg_3">
            <span>New community</span>
          </li>
          <li
            className="py-3 pl-5 cursor-pointer hover:bg-dark_bg_3"
            onClick={() => {
              setShowStarredMessages(true);
              setShowMenu(false);
            }}
          >
            <span>Starred messages</span>
          </li>
          <li
            className="py-3 pl-5 cursor-pointer hover:bg-dark_bg_3"
            onClick={() => {
              setShowSettings(true);
              setShowMenu(false);
            }}
          >
            <span>Settings</span>
          </li>
          <li
            className="py-3 pl-5 cursor-pointer hover:bg-dark_bg_3"
            onClick={handleLogout}
          >
            <span>Logout</span>
          </li>
        </ul>
      </div>
    </>
  );
}
