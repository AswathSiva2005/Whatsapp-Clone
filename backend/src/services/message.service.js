import createHttpError from "http-errors";
import { MessageModel } from "../models/index.js";
export const createMessage = async (data) => {
  let newMessage = await MessageModel.create(data);
  if (!newMessage)
    throw createHttpError.BadRequest("Oops...Something went wrong !");
  return newMessage;
};

export const populateMessage = async (id) => {
  let msg = await MessageModel.findById(id)
    .populate({
      path: "sender",
      select: "name picture",
      model: "UserModel",
    })
    .populate({
      path: "conversation",
      select: "name picture isGroup users",
      model: "ConversationModel",
      populate: {
        path: "users",
        select: "name email picture status blockedUsers",
        model: "UserModel",
      },
    });
  if (!msg) throw createHttpError.BadRequest("Oops...Something went wrong !");
  return msg;
};

export const getConvoMessages = async (
  convo_id,
  blockedUserIds = [],
  currentUserId
) => {
  const query = { conversation: convo_id };
  if (blockedUserIds.length > 0) {
    query.sender = { $nin: blockedUserIds };
  }
  if (currentUserId) {
    query.deletedFor = { $ne: currentUserId };
  }

  const messages = await MessageModel.find(query)
    .populate("sender", "name picture email status")
    .populate("conversation")
    .sort({ createdAt: 1 });
  if (!messages) {
    throw createHttpError.BadRequest("Oops...Something went wrong !");
  }
  return messages;
};

export const updateMessageStatus = async (messageId, status) => {
  const message = await MessageModel.findByIdAndUpdate(
    messageId,
    { status },
    { new: true }
  );
  if (!message) throw createHttpError.BadRequest("Message not found");
  return message;
};

export const toggleMessageStarForUser = async (messageId, userId) => {
  const message = await MessageModel.findById(messageId).populate({
    path: "conversation",
    select: "users",
  });

  if (!message) throw createHttpError.NotFound("Message not found");

  const isParticipant = message.conversation?.users?.some(
    (participant) => String(participant) === String(userId)
  );

  if (!isParticipant) {
    throw createHttpError.Forbidden("You are not allowed to update this message");
  }

  const alreadyStarred = (message.starredBy || []).some(
    (starredUserId) => String(starredUserId) === String(userId)
  );

  if (alreadyStarred) {
    message.starredBy = message.starredBy.filter(
      (starredUserId) => String(starredUserId) !== String(userId)
    );
  } else {
    message.starredBy.push(userId);
  }

  await message.save();

  return {
    messageId: message._id,
    starred: !alreadyStarred,
  };
};

export const deleteMessageForUser = async (messageId, userId) => {
  const message = await MessageModel.findById(messageId).populate({
    path: "conversation",
    select: "users",
  });

  if (!message) throw createHttpError.NotFound("Message not found");

  const isParticipant = message.conversation?.users?.some(
    (participant) => String(participant) === String(userId)
  );

  if (!isParticipant) {
    throw createHttpError.Forbidden("You are not allowed to delete this message");
  }

  await MessageModel.findByIdAndUpdate(messageId, {
    $addToSet: { deletedFor: userId },
  });

  return { messageId };
};

export const getStarredMessagesForUser = async (userId) => {
  const messages = await MessageModel.find({
    starredBy: userId,
    deletedFor: { $ne: userId },
  })
    .populate("sender", "name picture email status")
    .populate("conversation", "name isGroup users")
    .sort({ createdAt: -1 });

  return messages;
};
