import { useDispatch } from "react-redux";
import { logout } from "../../../features/userSlice";

export default function Menu({
  setShowCreateGroup,
  setShowSettings,
  setShowStarredMessages,
  setShowMenu,
}) {
  const dispatch = useDispatch();
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
            onClick={() => {
              dispatch(logout());
              setShowMenu(false);
            }}
          >
            <span>Logout</span>
          </li>
        </ul>
      </div>
    </>
  );
}
