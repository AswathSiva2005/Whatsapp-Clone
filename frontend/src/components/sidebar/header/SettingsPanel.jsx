import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ReturnIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

export default function SettingsPanel({ setShowSettings }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  const handleSettingsClick = () => {
    setShowSettings(false);
    navigate("/settings");
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark_bg_2 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          className="btn w-6 h-6 border"
          onClick={() => setShowSettings(false)}
        >
          <ReturnIcon className="fill-white" />
        </button>
        <h2 className="text-lg font-semibold dark:text-dark_text_1">Settings</h2>
      </div>

      <div className="space-y-4 dark:text-dark_text_1">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80" onClick={handleSettingsClick}>
          <img
            src={user.picture || getTwoLetterAvatarUrl(user.name)}
            alt={user.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTwoLetterAvatarUrl(user.name);
            }}
            className="w-14 h-14 rounded-full object-cover"
          />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm dark:text-dark_text_2">{user.status}</p>
          </div>
        </div>

        <div className="dark:bg-dark_bg_3 p-3 rounded-md">
          <p className="text-xs dark:text-dark_text_2">Email</p>
          <p className="text-sm">{user.email || "Not set"}</p>
        </div>

        <div className="dark:bg-dark_bg_3 p-3 rounded-md">
          <p className="text-xs dark:text-dark_text_2">Phone</p>
          <p className="text-sm">{user.phone || "Not set"}</p>
        </div>

        <button
          onClick={handleSettingsClick}
          className="w-full dark:bg-dark_bg_3 hover:dark:bg-dark_bg_2 p-3 rounded-md text-center font-medium transition"
        >
          ✏️ Edit Profile
        </button>
      </div>
    </div>
  );
}
