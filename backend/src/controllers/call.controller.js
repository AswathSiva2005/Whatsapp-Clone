import createHttpError from "http-errors";
import { CallModel, ConversationModel } from "../models/index.js";

const ensureParticipant = async (conversationId, callerId, receiverId) => {
  const convo = await ConversationModel.findById(conversationId).select("users");
  if (!convo) {
    throw createHttpError.NotFound("Conversation not found.");
  }

  const hasCaller = convo.users.some((id) => String(id) === String(callerId));
  const hasReceiver = convo.users.some((id) => String(id) === String(receiverId));

  if (!hasCaller || !hasReceiver) {
    throw createHttpError.Forbidden("Users are not part of this conversation.");
  }
};

export const startCall = async (req, res, next) => {
  try {
    const callerId = req.user.userId;
    const { receiverId, conversationId, type = "video" } = req.body;

    if (!receiverId || !conversationId) {
      throw createHttpError.BadRequest("receiverId and conversationId are required.");
    }

    if (!["audio", "video"].includes(type)) {
      throw createHttpError.BadRequest("Call type must be audio or video.");
    }

    await ensureParticipant(conversationId, callerId, receiverId);

    const call = await CallModel.create({
      caller: callerId,
      receiver: receiverId,
      conversation: conversationId,
      type,
      status: "ringing",
    });

    const populated = await CallModel.findById(call._id)
      .populate("caller", "name picture")
      .populate("receiver", "name picture")
      .populate("conversation", "name isGroup");

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const acceptCall = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.params;

    const call = await CallModel.findById(callId);
    if (!call) throw createHttpError.NotFound("Call not found.");

    const isParticipant =
      String(call.caller) === String(userId) || String(call.receiver) === String(userId);
    if (!isParticipant) {
      throw createHttpError.Forbidden("You are not part of this call.");
    }

    if (call.status === "ringing") {
      call.status = "accepted";
      call.startedAt = new Date();
      await call.save();
    }

    const populated = await CallModel.findById(call._id)
      .populate("caller", "name picture")
      .populate("receiver", "name picture")
      .populate("conversation", "name isGroup");

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

export const endCall = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.params;
    const { reason = "ended", durationSeconds } = req.body;

    const call = await CallModel.findById(callId);
    if (!call) throw createHttpError.NotFound("Call not found.");

    const isParticipant =
      String(call.caller) === String(userId) || String(call.receiver) === String(userId);
    if (!isParticipant) {
      throw createHttpError.Forbidden("You are not part of this call.");
    }

    if (["completed", "rejected", "missed", "cancelled"].includes(call.status)) {
      return res.status(200).json(call);
    }

    if (call.status === "ringing") {
      if (reason === "rejected") {
        call.status = "rejected";
      } else if (reason === "missed") {
        call.status = "missed";
      } else {
        call.status = "cancelled";
      }
    } else {
      call.status = "completed";
    }

    call.endedAt = new Date();

    if (Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) >= 0) {
      call.durationSeconds = Number(durationSeconds);
    } else if (call.startedAt) {
      call.durationSeconds = Math.max(
        0,
        Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
      );
    }

    await call.save();

    const populated = await CallModel.findById(call._id)
      .populate("caller", "name picture")
      .populate("receiver", "name picture")
      .populate("conversation", "name isGroup");

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getCallHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const calls = await CallModel.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate("caller", "name picture")
      .populate("receiver", "name picture")
      .populate("conversation", "name isGroup")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(calls);
  } catch (error) {
    next(error);
  }
};

export const deleteCall = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.params;

    const call = await CallModel.findById(callId);
    if (!call) throw createHttpError.NotFound("Call not found.");

    const isParticipant =
      String(call.caller) === String(userId) || String(call.receiver) === String(userId);
    if (!isParticipant) {
      throw createHttpError.Forbidden("You are not part of this call.");
    }

    await CallModel.findByIdAndDelete(callId);
    res.status(200).json({ message: "Call deleted successfully.", callId });
  } catch (error) {
    next(error);
  }
};
