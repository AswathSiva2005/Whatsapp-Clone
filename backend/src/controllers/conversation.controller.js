import createHttpError from "http-errors";
import logger from "../configs/logger.config.js";
import {
  createConversation,
  doesConversationExist,
  getUserConversations,
  populateConversation,
  isUserBlocked,
} from "../services/conversation.service.js";
import { findUser } from "../services/user.service.js";
import { ConversationModel, MessageModel } from "../models/index.js";

export const create_open_conversation = async (req, res, next) => {
  try {
    const sender_id = req.user.userId;
    const { receiver_id } = req.body;
    if (!receiver_id) {
      logger.error("receiver_id is required");
      throw createHttpError.BadGateway("Something went wrong ");
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
      console.log("cool");
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
  const { name, users } = req.body;
  //add current user to users
  users.push(req.user.userId);
  if (!name || !users) {
    throw createHttpError.BadRequest("Please fill all fields.");
  }
  if (users.length < 2) {
    throw createHttpError.BadRequest(
      "Atleast 2 users are required to start a group chat."
    );
  }
  let convoData = {
    name,
    users,
    isGroup: true,
    admin: req.user.userId,
    picture: process.env.DEFAULT_GROUP_PICTURE,
  };
  try {
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
    if (!conversation.users.includes(userId)) {
      throw createHttpError.Forbidden("You are not part of this conversation.");
    }

    // Delete all messages in this conversation
    await MessageModel.deleteMany({ conversationId });

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
    if (!conversation.users.includes(userId)) {
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
