import { getTwoLetterAvatarUrl } from "./avatar";

export const getNicknameForUser = (contacts = [], targetUserId) => {
  if (!targetUserId) return "";

  const matched = (Array.isArray(contacts) ? contacts : []).find((contact) => {
    const linkedId = contact?.user?._id || contact?.user;
    return String(linkedId || "") === String(targetUserId);
  });

  return String(matched?.nickname || "").trim();
};

export const getDisplayNameForUser = (contacts = [], targetUser) => {
  if (!targetUser) return "";
  const nickname = getNicknameForUser(contacts, targetUser?._id);
  if (nickname) return nickname;
  return targetUser?.name || "";
};

const resolveMemberId = (member) => member?._id || member;

const getOtherMember = (user, users = []) => {
  const userId = String(user?._id || "");
  return (Array.isArray(users) ? users : []).find(
    (member) => String(resolveMemberId(member) || "") !== userId
  );
};

export const getConversationId = (user, users) => {
  const other = getOtherMember(user, users);
  return resolveMemberId(other) || "";
};
export const getConversationName = (user, users) => {
  const other = getOtherMember(user, users);
  return other?.name || "";
};
export const getConversationPicture = (user, users) => {
  const otherUser = getOtherMember(user, users);
  if (otherUser?.picture) return otherUser.picture;
  return getTwoLetterAvatarUrl(otherUser?.name || "User");
};

export const checkOnlineStatus = (onlineUsers, user, users) => {
  const convoId = String(getConversationId(user, users) || "");
  const check = (Array.isArray(onlineUsers) ? onlineUsers : []).find(
    (u) => String(u.userId || "") === convoId
  );
  return Boolean(check);
};
