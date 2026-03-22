import createHttpError from "http-errors";
import { StatusModel, UserModel } from "../models/index.js";
import {
  createConversation,
  doesConversationExist,
  updateLatestMessage,
} from "./conversation.service.js";
import { createMessage, populateMessage } from "./message.service.js";

const toObjectIdString = (value) => String(value);

export const createStatus = async ({ userId, text, mediaUrl, mediaType }) => {
  const payload = {
    user: userId,
    text: text || "",
    mediaUrl: mediaUrl || "",
    mediaType: mediaType || (mediaUrl ? "image" : "text"),
  };

  const status = await StatusModel.create(payload);
  return StatusModel.findById(status._id).populate("user", "name picture status");
};

export const deleteStatusByOwner = async ({ statusId, userId }) => {
  const status = await StatusModel.findById(statusId);
  if (!status) throw createHttpError.NotFound("Status not found.");

  if (toObjectIdString(status.user) !== toObjectIdString(userId)) {
    throw createHttpError.Forbidden("You can only delete your own status.");
  }

  await StatusModel.findByIdAndDelete(statusId);
  return { statusId };
};

export const getStatusFeed = async ({ userId }) => {
  const now = new Date();

  const activeStatuses = await StatusModel.find({ expiresAt: { $gt: now } })
    .populate("user", "name picture status blockedUsers")
    .populate("likes", "name picture status")
    .sort({ createdAt: -1 });

  const currentUser = await UserModel.findById(userId).select("blockedUsers");
  const myBlocked = (currentUser?.blockedUsers || []).map(toObjectIdString);

  const visibleStatuses = activeStatuses.filter((status) => {
    const ownerId = toObjectIdString(status.user?._id || status.user);
    if (ownerId === toObjectIdString(userId)) return true;

    const ownerBlockedUsers = (status.user?.blockedUsers || []).map(toObjectIdString);
    if (ownerBlockedUsers.includes(toObjectIdString(userId))) return false;
    if (myBlocked.includes(ownerId)) return false;
    return true;
  });

  const mine = [];
  const grouped = new Map();

  visibleStatuses.forEach((status) => {
    const ownerId = toObjectIdString(status.user._id);
    const mappedStatus = {
      _id: status._id,
      text: status.text,
      mediaUrl: status.mediaUrl,
      mediaType: status.mediaType,
      likes: (status.likes || []).map((likedUser) =>
        toObjectIdString(likedUser?._id || likedUser)
      ),
      likesDetailed: (status.likes || []).map((likedUser) => ({
        _id: likedUser?._id || likedUser,
        name: likedUser?.name || "",
        picture: likedUser?.picture || "",
        status: likedUser?.status || "",
      })),
      viewers: status.viewers,
      replies: status.replies,
      expiresAt: status.expiresAt,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
      user: {
        _id: status.user._id,
        name: status.user.name,
        picture: status.user.picture,
        status: status.user.status,
      },
    };

    if (ownerId === toObjectIdString(userId)) {
      mine.push(mappedStatus);
      return;
    }

    if (!grouped.has(ownerId)) {
      grouped.set(ownerId, {
        user: {
          _id: status.user._id,
          name: status.user.name,
          picture: status.user.picture,
          status: status.user.status,
        },
        statuses: [],
      });
    }

    grouped.get(ownerId).statuses.push(mappedStatus);
  });

  return {
    mine,
    feed: Array.from(grouped.values()),
  };
};

export const toggleLikeOnStatus = async ({ statusId, userId }) => {
  const status = await StatusModel.findById(statusId);
  if (!status) throw createHttpError.NotFound("Status not found.");

  const isLiked = (status.likes || []).some(
    (likeUserId) => toObjectIdString(likeUserId) === toObjectIdString(userId)
  );

  if (isLiked) {
    status.likes = status.likes.filter(
      (likeUserId) => toObjectIdString(likeUserId) !== toObjectIdString(userId)
    );
  } else {
    status.likes.push(userId);
  }

  await status.save();

  return {
    statusId: status._id,
    liked: !isLiked,
    likesCount: status.likes.length,
  };
};

export const markStatusAsViewed = async ({ statusId, userId }) => {
  await StatusModel.findByIdAndUpdate(statusId, {
    $addToSet: { viewers: userId },
  });
};

export const replyToStatus = async ({ statusId, userId, text }) => {
  const status = await StatusModel.findById(statusId).populate("user", "name picture");
  if (!status) throw createHttpError.NotFound("Status not found.");

  const replyText = (text || "").trim();
  if (!replyText) throw createHttpError.BadRequest("Reply text is required.");

  status.replies.push({ from: userId, text: replyText });
  await status.save();

  const ownerId = toObjectIdString(status.user._id);
  if (ownerId === toObjectIdString(userId)) {
    return { replied: true };
  }

  let conversation = await doesConversationExist(userId, ownerId);

  if (!conversation) {
    conversation = await createConversation({
      name: status.user.name,
      picture: status.user.picture,
      isGroup: false,
      users: [userId, ownerId],
    });
  }

  const messageData = {
    sender: userId,
    message: `Status reply: ${replyText}`,
    conversation: conversation._id || conversation.id,
    files: [],
  };

  const newMessage = await createMessage(messageData);
  await updateLatestMessage(messageData.conversation, newMessage);
  await populateMessage(newMessage._id);

  return { replied: true };
};
