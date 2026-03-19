import logger from "../configs/logger.config.js";
import { updateLatestMessage } from "../services/conversation.service.js";
import {
  createMessage,
  deleteMessageForUser,
  deleteMessageForEveryone,
  getConvoMessages,
  getStarredMessagesForUser,
  populateMessage,
  votePollOption,
  toggleMessageStarForUser,
} from "../services/message.service.js";
import { ConversationModel, UserModel } from "../models/index.js";

export const sendMessage = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { message, convo_id, files, poll } = req.body;
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    const hasFiles = Array.isArray(files) ? files.length > 0 : Boolean(files);
    const hasPoll =
      poll &&
      typeof poll.question === "string" &&
      poll.question.trim() &&
      Array.isArray(poll.options) &&
      poll.options.length >= 2;

    if (!convo_id || (!normalizedMessage && !hasFiles && !hasPoll)) {
      logger.error("Please provide a conversation id and a non-empty message or files.");
      return res.status(400).json({
        error: {
          status: 400,
          message: "convo_id and a non-empty message or files or poll are required.",
        },
      });
    }

    const conversation = await ConversationModel.findById(convo_id).select(
      "users disappearingSettings"
    );

    if (!conversation) {
      return res.status(404).json({
        error: {
          status: 404,
          message: "Conversation not found.",
        },
      });
    }

    const isParticipant = conversation.users.some(
      (participantId) => String(participantId) === String(user_id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        error: {
          status: 403,
          message: "You are not part of this conversation.",
        },
      });
    }

    const userDisappearSetting = (conversation.disappearingSettings || []).find(
      (entry) => String(entry.user) === String(user_id)
    );

    const shouldExpire =
      userDisappearSetting?.mode === "timed" && userDisappearSetting?.seconds > 0;

    const expiresAt = shouldExpire
      ? new Date(Date.now() + Number(userDisappearSetting.seconds) * 1000)
      : null;

    const normalizedPoll = hasPoll
      ? {
          question: poll.question.trim(),
          options: poll.options
            .map((option) =>
              typeof option === "string"
                ? { label: option.trim(), votes: [] }
                : {
                    label: String(option.label || "").trim(),
                    votes: Array.isArray(option.votes) ? option.votes : [],
                  }
            )
            .filter((option) => option.label),
          allowMultipleAnswers: Boolean(poll.allowMultipleAnswers),
        }
      : undefined;

    if (normalizedPoll && normalizedPoll.options.length < 2) {
      return res.status(400).json({
        error: {
          status: 400,
          message: "A poll requires at least 2 valid options.",
        },
      });
    }

    const msgData = {
      sender: user_id,
      message: normalizedMessage,
      conversation: convo_id,
      files: files || [],
      poll: normalizedPoll,
      expiresAt,
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
      return res.status(400).json({
        error: {
          status: 400,
          message: "convo_id parameter is required.",
        },
      });
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

export const deleteMessageForEveryoneHandler = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const result = await deleteMessageForEveryone(messageId, userId);
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

export const votePoll = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.userId;

    const updatedMessage = await votePollOption({
      messageId,
      optionIndex,
      userId,
    });

    res.status(200).json(updatedMessage);
  } catch (error) {
    next(error);
  }
};
