import logger from "../configs/logger.config.js";
import { updateLatestMessage } from "../services/conversation.service.js";
import {
  createMessage,
  deleteMessageForUser,
  getConvoMessages,
  getStarredMessagesForUser,
  populateMessage,
  toggleMessageStarForUser,
} from "../services/message.service.js";
import { UserModel } from "../models/index.js";

export const sendMessage = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { message, convo_id, files } = req.body;
    if (!convo_id || (!message && !files)) {
      logger.error("Please provider a conversation id and a message body");
      return res.sendStatus(400);
    }
    const msgData = {
      sender: user_id,
      message,
      conversation: convo_id,
      files: files || [],
    };
    let newMessage = await createMessage(msgData);
    let populatedMessage = await populateMessage(newMessage._id);
    await updateLatestMessage(convo_id, newMessage);
    res.json(populatedMessage);
  } catch (error) {
    next(error);
  }
};
export const getMessages = async (req, res, next) => {
  try {
    const convo_id = req.params.convo_id;
    const user_id = req.user.userId;
    if (!convo_id) {
      logger.error("Please add a conversation id in params.");
      res.sendStatus(400);
    }
    const currentUser = await UserModel.findById(user_id).select("blockedUsers");
    const blockedUserIds = currentUser?.blockedUsers || [];
    const messages = await getConvoMessages(convo_id, blockedUserIds, user_id);
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

export const toggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const result = await toggleMessageStarForUser(messageId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteSingleMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const result = await deleteMessageForUser(messageId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getStarredMessages = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const messages = await getStarredMessagesForUser(userId);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};
