import createHttpError from "http-errors";
import logger from "../configs/logger.config.js";
import {
  createConversation,
  doesConversationExist,
  getConversationByIdForUser,
  getUserConversations,
  populateConversation,
} from "../services/conversation.service.js";
import { findUser } from "../services/user.service.js";
import { ConversationModel, MessageModel } from "../models/index.js";

export const create_open_conversation = async (req, res, next) => {
  try {
    const sender_id = req.user.userId;
    const { receiver_id } = req.body;
    if (!receiver_id) {
      logger.error("receiver_id is required");
      throw createHttpError.BadRequest("receiver_id is required.");
    }

    const existedConversation = await doesConversationExist(
      sender_id,
      receiver_id
    );
    if (existedConversation) {
      res.json(existedConversation);
    } else {
      // Allow opening/creating conversation with anyone (including blocked users)
      // This lets users unblock from the contact drawer
      let reciever_user = await findUser(receiver_id);
      let convoData = {
        name: reciever_user.name,
        picture: reciever_user.picture,
        isGroup: false,
        users: [sender_id, receiver_id],
      };
      const newConvo = await createConversation(convoData);
      const populatedConvo = await populateConversation(
        newConvo._id,
        "users",
        "-password"
      );
      res.status(200).json(populatedConvo);
    }
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const conversations = await getUserConversations(user_id);
    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
};
export const createGroup = async (req, res, next) => {
  try {
    const { name, users, description = "", picture } = req.body;
    const currentUserId = req.user.userId;
    const userIds = Array.isArray(users) ? users : [];
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedName || !Array.isArray(users)) {
      throw createHttpError.BadRequest("Please fill all fields.");
    }

    const uniqueUsers = [...new Set([...userIds, currentUserId])];

    if (uniqueUsers.length < 3) {
      throw createHttpError.BadRequest(
        "Atleast 2 users are required to start a group chat."
      );
    }

    const convoData = {
      name: normalizedName,
      users: uniqueUsers,
      description,
      isGroup: true,
      admin: currentUserId,
      picture: picture || process.env.DEFAULT_GROUP_PICTURE,
      disappearingSettings: uniqueUsers.map((id) => ({
        user: id,
        mode: "off",
        seconds: 0,
      })),
    };

    const newConvo = await createConversation(convoData);
    const populatedConvo = await populateConversation(
      newConvo._id,
      "users admin",
      "-password"
    );
    res.status(200).json(populatedConvo);
  } catch (error) {
    next(error);
  }
};

const getValidatedGroup = async (conversationId, userId) => {
  const conversation = await getConversationByIdForUser(conversationId);

  if (!conversation.isGroup) {
    throw createHttpError.BadRequest("This action is allowed only for groups.");
  }

  const isParticipant = conversation.users.some(
    (participantId) => String(participantId._id || participantId) === String(userId)
  );

  if (!isParticipant) {
    throw createHttpError.Forbidden("You are not part of this group.");
  }

  return conversation;
};

export const getGroupDetails = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const group = await getValidatedGroup(conversationId, userId);
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { name, description, picture } = req.body;

    const group = await getValidatedGroup(conversationId, userId);

    if (String(group.admin?._id || group.admin) !== String(userId)) {
      throw createHttpError.Forbidden("Only group admin can update group info.");
    }

    if (typeof name === "string" && name.trim()) {
      group.name = name.trim();
    }

    if (typeof description === "string") {
      group.description = description.trim();
    }

    if (typeof picture === "string" && picture.trim()) {
      group.picture = picture.trim();
    }

    await group.save();
    const updated = await getConversationByIdForUser(conversationId);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const addGroupMembers = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      throw createHttpError.BadRequest("users array is required.");
    }

    const group = await getValidatedGroup(conversationId, userId);

    if (String(group.admin?._id || group.admin) !== String(userId)) {
      throw createHttpError.Forbidden("Only group admin can add members.");
    }

    const existing = new Set(group.users.map((u) => String(u._id || u)));
    users.forEach((memberId) => {
      if (!existing.has(String(memberId))) {
        group.users.push(memberId);
      }
    });

    const configuredUsers = new Set(
      (group.disappearingSettings || []).map((entry) => String(entry.user))
    );

    users.forEach((memberId) => {
      if (!configuredUsers.has(String(memberId))) {
        group.disappearingSettings.push({
          user: memberId,
          mode: "off",
          seconds: 0,
        });
      }
    });

    await group.save();
    const updated = await getConversationByIdForUser(conversationId);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const removeGroupMember = async (req, res, next) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.user.userId;

    const group = await getValidatedGroup(conversationId, userId);
    const isAdmin = String(group.admin?._id || group.admin) === String(userId);
    const isSelf = String(memberId) === String(userId);

    if (!isAdmin && !isSelf) {
      throw createHttpError.Forbidden(
        "Only admin can remove other members from the group."
      );
    }

    group.users = group.users.filter(
      (member) => String(member._id || member) !== String(memberId)
    );
    group.disappearingSettings = (group.disappearingSettings || []).filter(
      (entry) => String(entry.user) !== String(memberId)
    );

    if (group.users.length === 0) {
      await ConversationModel.findByIdAndDelete(conversationId);
      return res.status(200).json({ deleted: true, conversationId });
    }

    if (String(group.admin?._id || group.admin) === String(memberId)) {
      group.admin = group.users[0];
    }

    await group.save();
    const updated = await getConversationByIdForUser(conversationId);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const exitGroup = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const group = await getValidatedGroup(conversationId, userId);

    group.users = group.users.filter(
      (member) => String(member._id || member) !== String(userId)
    );
    group.disappearingSettings = (group.disappearingSettings || []).filter(
      (entry) => String(entry.user) !== String(userId)
    );

    if (group.users.length === 0) {
      await ConversationModel.findByIdAndDelete(conversationId);
      return res.status(200).json({ deleted: true, conversationId });
    }

    if (String(group.admin?._id || group.admin) === String(userId)) {
      group.admin = group.users[0];
    }

    await group.save();
    const updated = await getConversationByIdForUser(conversationId);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const setDisappearingMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { mode = "off", seconds = 0 } = req.body;

    const conversation = await getConversationByIdForUser(conversationId);
    const isParticipant = conversation.users.some(
      (participantId) =>
        String(participantId._id || participantId) === String(userId)
    );

    if (!isParticipant) {
      throw createHttpError.Forbidden(
        "You are not part of this conversation."
      );
    }

    if (!["off", "timed"].includes(mode)) {
      throw createHttpError.BadRequest("mode must be either 'off' or 'timed'.");
    }

    const validSeconds = Number(seconds) || 0;
    const index = (conversation.disappearingSettings || []).findIndex(
      (entry) => String(entry.user) === String(userId)
    );

    if (index > -1) {
      conversation.disappearingSettings[index].mode = mode;
      conversation.disappearingSettings[index].seconds =
        mode === "off" ? 0 : validSeconds;
    } else {
      conversation.disappearingSettings.push({
        user: userId,
        mode,
        seconds: mode === "off" ? 0 : validSeconds,
      });
    }

    await conversation.save();
    const updated = await getConversationByIdForUser(conversationId);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const clearChat = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      throw createHttpError.BadRequest("Conversation ID is required.");
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw createHttpError.NotFound("Conversation not found.");
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.users.some(
      (participantId) => String(participantId) === String(userId)
    );

    if (!isParticipant) {
      throw createHttpError.Forbidden("You are not part of this conversation.");
    }

    // Delete all messages in this conversation
    await MessageModel.deleteMany({ conversation: conversationId });

    res.status(200).json({ message: "Chat cleared successfully." });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      throw createHttpError.BadRequest("Conversation ID is required.");
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw createHttpError.NotFound("Conversation not found.");
    }

    // Check if user is part of this conversation
    const isParticipant = conversation.users.some(
      (participantId) => String(participantId) === String(userId)
    );

    if (!isParticipant) {
      throw createHttpError.Forbidden("You are not part of this conversation.");
    }

    // For group chats, remove user from the group
    if (conversation.isGroup) {
      conversation.users = conversation.users.filter(
        (u) => u.toString() !== userId
      );
      if (conversation.users.length === 0) {
        // Delete the group if no users left
        await ConversationModel.findByIdAndDelete(conversationId);
      } else {
        await conversation.save();
      }
    } else {
      // For 1-on-1 chats, delete the entire conversation
      await ConversationModel.findByIdAndDelete(conversationId);
    }

    res.status(200).json({ message: "Conversation deleted successfully." });
  } catch (error) {
    next(error);
  }
};
