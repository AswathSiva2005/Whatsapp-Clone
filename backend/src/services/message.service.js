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
  const query = {
    conversation: convo_id,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
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

export const deleteMessageForEveryone = async (messageId, userId) => {
  const message = await MessageModel.findById(messageId).populate({
    path: "conversation",
    select: "users",
  });

  if (!message) throw createHttpError.NotFound("Message not found");

  // Only sender can delete for everyone
  if (String(message.sender) !== String(userId)) {
    throw createHttpError.Forbidden("Only sender can delete message for everyone");
  }

  // Mark message as deleted for everyone
  const updatedMessage = await MessageModel.findByIdAndUpdate(
    messageId,
    {
      isDeletedForEveryone: true,
      message: "",
      files: [],
      poll: null,
    },
    { new: true }
  ).populate({
    path: "sender",
    select: "_id name picture",
  }).populate({
    path: "conversation",
    select: "_id isGroup",
  });

  return updatedMessage;
};

export const getStarredMessagesForUser = async (userId) => {
  const messages = await MessageModel.find({
    starredBy: userId,
    deletedFor: { $ne: userId },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate("sender", "name picture email status")
    .populate("conversation", "name isGroup users")
    .sort({ createdAt: -1 });

  return messages;
};

export const votePollOption = async ({ messageId, optionIndex, userId }) => {
  const message = await MessageModel.findById(messageId).populate({
    path: "conversation",
    select: "users",
  });

  if (!message) {
    throw createHttpError.NotFound("Message not found");
  }

  const isParticipant = message.conversation?.users?.some(
    (participant) => String(participant) === String(userId)
  );

  if (!isParticipant) {
    throw createHttpError.Forbidden("You are not allowed to vote in this poll");
  }

  if (!message.poll || !Array.isArray(message.poll.options)) {
    throw createHttpError.BadRequest("This message does not contain a poll");
  }

  const selectedIndex = Number(optionIndex);
  if (
    Number.isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= message.poll.options.length
  ) {
    throw createHttpError.BadRequest("Invalid poll option");
  }

  message.poll.options = message.poll.options.map((option) => ({
    ...option.toObject(),
    votes: (option.votes || []).filter((id) => String(id) !== String(userId)),
  }));

  message.poll.options[selectedIndex].votes.push(userId);
  await message.save();

  const populatedMessage = await populateMessage(message._id);
  return populatedMessage;
};
