import { DotsIcon } from "../../../svg";
import { useEffect, useRef, useState } from "react";
import Menu from "./Menu";
import { CreateGroup } from "./createGroup";
import SettingsPanel from "./SettingsPanel";
import StarredMessagesPanel from "./StarredMessagesPanel";

export default function SidebarHeader() {
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  return (
    <>
      {/*Sidebar header*/}
      <div className="h-[58px] dark:bg-[#111b21] flex items-center px-4">
        {/* container */}
        <div className="w-full flex items-center justify-between">
          <h2 className="text-[30px] leading-none font-medium tracking-tight dark:text-dark_text_1">
            Chats
          </h2>
          <ul className="flex items-center gap-x-1">
            <li>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center hover:dark:bg-dark_hover_1 text-dark_svg_1 text-xl"
                title="New chat"
                onClick={() => setShowCreateGroup(true)}
              >
                +
              </button>
            </li>
            <li className="relative" ref={menuRef}>
              <button
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  showMenu ? "bg-dark_hover_1" : "hover:dark:bg-dark_hover_1"
                }`}
                onClick={() => setShowMenu((prev) => !prev)}
              >
                <DotsIcon className="dark:fill-dark_svg_1" />
              </button>
              {showMenu ? (
                <Menu
                  setShowCreateGroup={setShowCreateGroup}
                  setShowSettings={setShowSettings}
                  setShowStarredMessages={setShowStarredMessages}
                  setShowMenu={setShowMenu}
                />
              ) : null}
            </li>
          </ul>
        </div>
      </div>
      {/*Create Group*/}
      {showCreateGroup && (
        <CreateGroup setShowCreateGroup={setShowCreateGroup} />
      )}
      {showSettings && <SettingsPanel setShowSettings={setShowSettings} />}
      {showStarredMessages && (
        <StarredMessagesPanel setShowStarredMessages={setShowStarredMessages} />
      )}
    </>
  );
}
