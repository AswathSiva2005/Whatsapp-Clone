import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../../features/userSlice";
import { CloseIcon } from "../../../svg";
import {
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../../../utils/chat";
import {
  addMembersToGroupConversation,
  exitGroupConversation,
  removeMemberFromGroupConversation,
  setDisappearingMessagesSetting,
  setActiveConversation,
  toggleFavoriteConversation,
  updateGroupConversation,
  upsertConversationFromServer,
} from "../../../features/chatSlice";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
import { uploadFiles } from "../../../utils/upload";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

export default function ContactInfoDrawer({ activeConversation, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const { favoriteConversationIds } = useSelector((state) => state.chat);
  const [busy, setBusy] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([]);
  const [disappearValue, setDisappearValue] = useState("off");

  const isGroup = activeConversation?.isGroup;

  useEffect(() => {
    if (!isGroup) return;
    setGroupName(activeConversation.name || "");
    setGroupDescription(activeConversation.description || "");

    const userDisappear = (activeConversation.disappearingSettings || []).find(
      (entry) => String(entry.user?._id || entry.user) === String(user._id)
    );

    if (!userDisappear || userDisappear.mode === "off") {
      setDisappearValue("off");
    } else {
      setDisappearValue(String(userDisappear.seconds || 0));
    }
  }, [activeConversation, isGroup, user._id]);

  useEffect(() => {
    if (!isGroup) return;
    const isCurrentUserAdmin =
      String(activeConversation?.admin?._id || activeConversation?.admin) ===
      String(user._id);

    if (!isCurrentUserAdmin) return;

    const keyword = memberSearch.trim();

    if (!keyword) {
      setMemberSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${resolveApiEndpoint()}/user?search=${encodeURIComponent(keyword)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const existingIds = new Set(
          (activeConversation?.users || []).map((u) => String(u._id))
        );

        setMemberSearchResults(
          (Array.isArray(data) ? data : []).filter(
            (candidate) => !existingIds.has(String(candidate._id))
          )
        );
      } catch {
        setMemberSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    isGroup,
    memberSearch,
    token,
    user._id,
    activeConversation?.admin,
    activeConversation?.users,
  ]);

  if (!activeConversation?._id) return null;

  const targetId = isGroup
    ? ""
    : getConversationId(user, activeConversation.users || []);
  const title = isGroup
    ? activeConversation.name
    : getConversationName(user, activeConversation.users || []);
  const picture = isGroup
    ? activeConversation.picture
    : getConversationPicture(user, activeConversation.users || []);
  const phone = isGroup
    ? ""
    : (activeConversation.users || []).find((u) => u._id !== user._id)?.phone;
  const status = isGroup
    ? ""
    : (activeConversation.users || []).find((u) => u._id !== user._id)?.status;
  const isAdmin =
    isGroup &&
    String(activeConversation.admin?._id || activeConversation.admin) ===
      String(user._id);
  const adminId = String(activeConversation.admin?._id || activeConversation.admin || "");
  const members = Array.isArray(activeConversation.users)
    ? [...activeConversation.users]
    : [];
  const hasAdminInMembers = members.some(
    (member) => String(member?._id || member) === adminId
  );

  if (isGroup && adminId && !hasAdminInMembers && activeConversation.admin) {
    members.unshift(activeConversation.admin);
  }

  // Check if user is blocked
  const isUserBlocked = !isGroup && user.blockedUsers?.includes(targetId);
  const isFavorite = favoriteConversationIds.includes(activeConversation._id);

  const toggleFavorite = () => {
    dispatch(toggleFavoriteConversation(activeConversation._id));
  };

  const blockUser = async () => {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${resolveApiEndpoint()}/user/block`,
        { userId: targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update Redux state with the updated blocked users list from server
      if (data.user) {
        dispatch(setUser({ blockedUsers: data.user.blockedUsers }));
      }
      alert(`Blocked ${title}`);
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to block user.");
    } finally {
      setBusy(false);
    }
  };

  const unblockUser = async () => {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${resolveApiEndpoint()}/user/unblock`,
        { userId: targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update Redux state with the updated blocked users list from server
      if (data.user) {
        dispatch(setUser({ blockedUsers: data.user.blockedUsers }));
      }
      alert(`Unblocked ${title}`);
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to unblock user.");
    } finally {
      setBusy(false);
    }
  };

  const clearChat = async () => {
    if (busy || !window.confirm("Are you sure you want to clear this chat?")) return;
    setBusy(true);
    try {
      await axios.post(
        `${resolveApiEndpoint()}/conversation/clear`,
        { conversationId: activeConversation._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Chat cleared successfully");
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to clear chat.");
    } finally {
      setBusy(false);
    }
  };

  const deleteChat = async () => {
    if (busy || !window.confirm("Are you sure you want to delete this chat?")) return;
    setBusy(true);
    try {
      await axios.post(
        `${resolveApiEndpoint()}/conversation/delete`,
        { conversationId: activeConversation._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setActiveConversation(null));
      alert("Chat deleted successfully");
      onClose();
    } catch (error) {
      alert(error?.response?.data?.error?.message || "Failed to delete chat.");
    } finally {
      setBusy(false);
    }
  };

  const onGroupImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setGroupImage(evt.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const saveGroupInfo = async () => {
    if (!isGroup || !isAdmin || busy) return;
    setBusy(true);
    try {
      let picture = "";
      if (groupImage && groupImage.startsWith("data:")) {
        const res = await fetch(groupImage);
        const blob = await res.blob();
        const uploaded = await uploadFiles(
          [
            {
              file: new File([blob], "group-image.png", { type: blob.type }),
              type: "IMAGE",
            },
          ],
          token
        );
        picture = uploaded?.[0]?.file?.secure_url || "";
      }

      const result = await dispatch(
        updateGroupConversation({
          token,
          conversationId: activeConversation._id,
          name: groupName,
          description: groupDescription,
          picture,
        })
      );

      if (result?.payload?._id) {
        dispatch(upsertConversationFromServer(result.payload));
      }
      alert("Group updated successfully");
    } catch {
      alert("Failed to update group");
    } finally {
      setBusy(false);
    }
  };

  const toggleMemberToAdd = (memberId) => {
    if (selectedMembersToAdd.includes(memberId)) {
      setSelectedMembersToAdd((prev) => prev.filter((id) => id !== memberId));
      return;
    }
    setSelectedMembersToAdd((prev) => [...prev, memberId]);
  };

  const addMembers = async () => {
    if (!isAdmin || selectedMembersToAdd.length === 0 || busy) return;
    setBusy(true);
    try {
      const result = await dispatch(
        addMembersToGroupConversation({
          token,
          conversationId: activeConversation._id,
          users: selectedMembersToAdd,
        })
      );
      if (result?.payload?._id) {
        dispatch(upsertConversationFromServer(result.payload));
      }
      setSelectedMembersToAdd([]);
      setMemberSearchResults([]);
      setMemberSearch("");
      alert("Members added");
    } catch {
      alert("Failed to add members");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!isAdmin || busy) return;
    if (!window.confirm("Remove this member from group?")) return;
    setBusy(true);
    try {
      const result = await dispatch(
        removeMemberFromGroupConversation({
          token,
          conversationId: activeConversation._id,
          memberId,
        })
      );
      if (result?.payload?._id) {
        dispatch(upsertConversationFromServer(result.payload));
      }
      alert("Member removed");
    } catch {
      alert("Failed to remove member");
    } finally {
      setBusy(false);
    }
  };

  const exitGroup = async () => {
    if (busy || !window.confirm("Exit this group?")) return;
    setBusy(true);
    try {
      await dispatch(
        exitGroupConversation({
          token,
          conversationId: activeConversation._id,
        })
      );
      dispatch(setActiveConversation({}));
      alert("Exited group");
      onClose();
    } catch {
      alert("Failed to exit group");
    } finally {
      setBusy(false);
    }
  };

  const changeDisappearing = async (value) => {
    if (busy) return;
    setDisappearValue(value);
    setBusy(true);
    try {
      const isOff = value === "off";
      const result = await dispatch(
        setDisappearingMessagesSetting({
          token,
          conversationId: activeConversation._id,
          mode: isOff ? "off" : "timed",
          seconds: isOff ? 0 : Number(value),
        })
      );
      if (result?.payload?._id) {
        dispatch(upsertConversationFromServer(result.payload));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-full sm:w-[420px] max-w-full dark:bg-dark_bg_2 border-l dark:border-l-dark_border_2 z-50 flex flex-col">
      <div className="h-[59px] px-4 dark:bg-dark_bg_2 flex items-center gap-4 border-b dark:border-b-dark_border_2">
        <button className="btn" onClick={onClose}>
          <CloseIcon className="fill-dark_svg_1" />
        </button>
        <h2 className="dark:text-dark_text_1 text-lg font-medium">
          {isGroup ? "Group info" : "Contact info"}
        </h2>
      </div>

      <div className="overflow-y-auto scrollbar flex-1">
        <div className="dark:bg-dark_bg_1 p-6 sm:p-8 flex flex-col items-center border-b dark:border-b-dark_border_2">
          <img
            src={picture || getTwoLetterAvatarUrl(title)}
            alt={title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTwoLetterAvatarUrl(title);
            }}
            className="w-32 sm:w-44 h-32 sm:h-44 rounded-full object-cover mb-5"
          />
          <h3 className="dark:text-dark_text_1 text-xl sm:text-[32px] leading-6 sm:leading-10 font-light text-center">
            {title}
          </h3>
          {!isGroup && (
            <p className="dark:text-dark_text_2 text-base sm:text-lg mt-2 text-center">{phone || ""}</p>
          )}
        </div>

        {!isGroup && (
          <div className="dark:bg-dark_bg_1 mt-2 p-4 sm:p-5 border-b dark:border-b-dark_border_2">
            <p className="text-xs sm:text-sm dark:text-dark_text_2 mb-2">About</p>
            <p className="dark:text-dark_text_1 text-sm">{status || "Hey there! I am using WhatsApp."}</p>
          </div>
        )}

        {isGroup && (
          <div className="dark:bg-dark_bg_1 mt-2 p-4 sm:p-5 border-b dark:border-b-dark_border_2 space-y-4">
            <p className="text-xs sm:text-sm dark:text-dark_text_2">Group details</p>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <img
                  src={groupImage || picture || getTwoLetterAvatarUrl(groupName || title)}
                  alt="Group"
                  className="w-12 h-12 rounded-full object-cover border dark:border-dark_border_2"
                />
                <input type="file" hidden accept="image/*" onChange={onGroupImageChange} />
              </label>
              <input
                type="text"
                className="flex-1 rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <textarea
              rows={3}
              className="w-full rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={300}
              disabled={!isAdmin}
            />
            {isAdmin && (
              <button
                className="px-4 py-2 rounded-md bg-green_1 text-white text-sm disabled:opacity-60"
                onClick={saveGroupInfo}
                disabled={busy}
              >
                Save group info
              </button>
            )}
          </div>
        )}

        <div className="dark:bg-dark_bg_1 mt-2 p-4 sm:p-5 border-b dark:border-b-dark_border_2">
          <p className="text-xs sm:text-sm dark:text-dark_text_2 mb-2">Disappearing messages</p>
          <select
            className="w-full rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
            value={disappearValue}
            onChange={(e) => changeDisappearing(e.target.value)}
            disabled={busy}
          >
            <option value="off">Off</option>
            <option value="3600">1 hour</option>
            <option value="28800">8 hours</option>
            <option value="86400">24 hours</option>
            <option value="604800">7 days</option>
          </select>
        </div>

        {isGroup && (
          <div className="dark:bg-dark_bg_1 mt-2 p-4 sm:p-5 border-b dark:border-b-dark_border_2">
            <p className="text-xs sm:text-sm dark:text-dark_text_2 mb-3">
              Members ({members.length || 0})
            </p>

            {isAdmin && (
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
                    placeholder="Search users to add"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>

                {memberSearchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border dark:border-dark_border_2">
                    {memberSearchResults.map((member) => (
                      <button
                        key={member._id}
                        className="w-full px-3 py-2 text-left text-sm hover:dark:bg-dark_bg_3"
                        onClick={() => toggleMemberToAdd(member._id)}
                      >
                        <span className="dark:text-dark_text_1">
                          {selectedMembersToAdd.includes(member._id) ? "[x] " : "[ ] "}
                          {member.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  className="px-4 py-2 rounded-md bg-green_1 text-white text-sm disabled:opacity-60"
                  onClick={addMembers}
                  disabled={busy || selectedMembersToAdd.length === 0}
                >
                  Add selected members
                </button>
              </div>
            )}

            <div className="space-y-2">
              {members.map((member) => {
                const memberId = String(member?._id || member || "");
                const memberName = member?.name || "Group member";
                const memberPicture = member?.picture || getTwoLetterAvatarUrl(memberName);

                return (
                <div
                  key={memberId}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:dark:bg-dark_bg_3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={memberPicture}
                      alt={memberName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm dark:text-dark_text_1 truncate">{memberName}</p>
                      <p className="text-xs dark:text-dark_text_2">
                        {String(activeConversation.admin?._id || activeConversation.admin) ===
                        memberId
                          ? "Creator"
                          : "Member"}
                      </p>
                    </div>
                  </div>

                  {isAdmin && memberId !== String(user._id) && (
                    <button
                      className="text-xs text-[#f15c6d]"
                      onClick={() => removeMember(memberId)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

        <div className="dark:bg-dark_bg_1 mt-2 py-2">
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 dark:text-dark_text_1 disabled:opacity-50 text-sm sm:text-base"
            disabled={busy}
            onClick={toggleFavorite}
          >
            {isFavorite ? "Remove from favourites" : "Add to favourites"}
          </button>
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 dark:text-dark_text_1 disabled:opacity-50 text-sm sm:text-base"
            onClick={clearChat}
            disabled={busy}
          >
            {busy ? "Clearing..." : "Clear chat"}
          </button>
          {!isGroup && !isUserBlocked && (
            <button
              className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] disabled:opacity-50 text-sm sm:text-base font-medium"
              onClick={blockUser}
              disabled={busy}
            >
              {busy ? "Blocking..." : `🚫 Block ${title}`}
            </button>
          )}
          {!isGroup && isUserBlocked && (
            <button
              className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-green_1 disabled:opacity-50 text-sm sm:text-base font-medium"
              onClick={unblockUser}
              disabled={busy}
            >
              {busy ? "Unblocking..." : `✓ Unblock ${title}`}
            </button>
          )}
          {!isGroup && (
            <button className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] text-sm sm:text-base">
              {`Report ${title}`}
            </button>
          )}
          {isGroup && (
            <button
              className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] disabled:opacity-50 text-sm sm:text-base font-medium"
              onClick={exitGroup}
              disabled={busy}
            >
              {busy ? "Please wait..." : "Exit group"}
            </button>
          )}
          <button
            className="w-full text-left px-4 sm:px-5 py-3 hover:dark:bg-dark_bg_3 text-[#f15c6d] disabled:opacity-50 text-sm sm:text-base"
            onClick={deleteChat}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete chat"}
          </button>
        </div>
      </div>
    </aside>
  );
}
