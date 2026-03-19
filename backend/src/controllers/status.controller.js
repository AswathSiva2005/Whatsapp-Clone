import createHttpError from "http-errors";
import {
  createStatus,
  deleteStatusByOwner,
  getStatusFeed,
  markStatusAsViewed,
  replyToStatus,
  toggleLikeOnStatus,
} from "../services/status.service.js";

export const createStatusHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { text, mediaUrl, mediaType } = req.body;

    if (!text && !mediaUrl) {
      throw createHttpError.BadRequest("Add text or image for status.");
    }

    const status = await createStatus({ userId, text, mediaUrl, mediaType });
    res.status(201).json(status);
  } catch (error) {
    next(error);
  }
};

export const getStatusFeedHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const feed = await getStatusFeed({ userId });
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
};

export const toggleLikeStatusHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { statusId } = req.params;
    const result = await toggleLikeOnStatus({ statusId, userId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const replyStatusHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { statusId } = req.params;
    const { text } = req.body;
    const result = await replyToStatus({ statusId, userId, text });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteStatusHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { statusId } = req.params;
    const result = await deleteStatusByOwner({ statusId, userId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const viewStatusHandler = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { statusId } = req.params;
    await markStatusAsViewed({ statusId, userId });
    res.status(200).json({ viewed: true });
  } catch (error) {
    next(error);
  }
};
