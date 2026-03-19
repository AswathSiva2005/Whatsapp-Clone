import createHttpError from "http-errors";
import { ConversationModel, UserModel } from "../models/index.js";

export const isUserBlocked = async (sender_id, receiver_id) => {
  const sender = await UserModel.findById(sender_id);
  if (!sender) throw createHttpError.NotFound("User not found.");
  return sender.blockedUsers.includes(receiver_id);
};

export const isUserBlockedByReceiver = async (sender_id, receiver_id) => {
  const receiver = await UserModel.findById(receiver_id);
  if (!receiver) throw createHttpError.NotFound("User not found.");
  return receiver.blockedUsers.includes(sender_id);
};

export const doesConversationExist = async (sender_id, receiver_id) => {
  let convos = await ConversationModel.find({
    isGroup: false,
    $and: [
      { users: { $elemMatch: { $eq: sender_id } } },
      { users: { $elemMatch: { $eq: receiver_id } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  if (!convos) throw createHttpError.BadRequest("Something went wrong");

  convos = await UserModel.populate(convos, {
    path: "latestMessage.sender",
    select: "name email picture status",
  });

  return convos[0];
};

export const createConversation = async (data) => {
  const newConvo = await ConversationModel.create(data);
  if (!newConvo)
    throw createHttpError.BadRequest("Oops...Something went wrong !");
  return newConvo;
};

export const populateConversation = async (
  id,
  fieldToPopulate,
  fieldsToRemove
) => {
  const populatedConvo = await ConversationModel.findOne({ _id: id }).populate(
    fieldToPopulate,
    fieldsToRemove
  );
  if (!populatedConvo)
    throw createHttpError.BadRequest("Oops...Something went wrong !");
  return populatedConvo;
};
export const getUserConversations = async (user_id) => {
  let conversations;
  await ConversationModel.find({
    users: { $elemMatch: { $eq: user_id } },
  })
    .populate("users", "-password")
    .populate("admin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 })
    .then(async (results) => {
      results = await UserModel.populate(results, {
        path: "latestMessage.sender",
        select: "name email picture status",
      });
      conversations = results;
    })
    .catch((err) => {
      throw createHttpError.BadRequest("Oops...Something went wrong !");
    });
  return conversations;
};

export const updateLatestMessage = async (convo_id, msg) => {
  const updatedConvo = await ConversationModel.findByIdAndUpdate(convo_id, {
    latestMessage: msg,
  });
  if (!updatedConvo)
    throw createHttpError.BadRequest("Oops...Something went wrong !");

  return updatedConvo;
};

export const getConversationByIdForUser = async (conversationId) => {
  const conversation = await ConversationModel.findById(conversationId)
    .populate("users", "-password")
    .populate("admin", "-password")
    .populate("latestMessage");

  if (!conversation) {
    throw createHttpError.NotFound("Conversation not found.");
  }

  return conversation;
};
