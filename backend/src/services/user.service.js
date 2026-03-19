import createHttpError from "http-errors";
import { UserModel } from "../models/index.js";

export const findUser = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw createHttpError.BadRequest("Please fill all fields.");
  return user;
};

export const searchUsers = async (keyword, userId) => {
  const users = await UserModel.find({
    $or: [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { phone: { $regex: keyword, $options: "i" } },
    ],
  }).find({
    _id: { $ne: userId },
  });
  return users;
};

export const searchByPhone = async (phone, userId) => {
  const user = await UserModel.findOne({
    phone: phone.trim(),
    _id: { $ne: userId },
  });
  return user;
};

export const updateUserProfile = async (userId, updateData) => {
  const { name, status, picture } = updateData;
  const validUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updateData, "name")) {
    validUpdates.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(updateData, "status")) {
    validUpdates.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(updateData, "picture")) {
    validUpdates.picture = picture;
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: validUpdates },
    { new: true }
  );

  if (!user) throw createHttpError.NotFound("User not found.");
  return user;
};

export const blockUser = async (userId, blockedUserId) => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $addToSet: { blockedUsers: blockedUserId } },
    { new: true }
  );
  if (!user) throw createHttpError.NotFound("User not found.");
  return user;
};

export const unblockUser = async (userId, blockedUserId) => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { blockedUsers: blockedUserId } },
    { new: true }
  );
  if (!user) throw createHttpError.NotFound("User not found.");
  return user;
};
