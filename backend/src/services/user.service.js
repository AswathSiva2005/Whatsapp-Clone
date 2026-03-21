import createHttpError from "http-errors";
import { UserModel } from "../models/index.js";
import bcrypt from "bcrypt";

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

export const configureAppLock = async (userId, values) => {
  const { enabled, pin, currentPin } = values;
  const updates = {};
  const user = await UserModel.findById(userId).select("appLockEnabled appLockPinHash");
  if (!user) throw createHttpError.NotFound("User not found.");

  if (enabled === false) {
    updates.appLockEnabled = false;
    updates.appLockPinHash = "";
  } else {
    if (!/^\d{4}$/.test(String(pin || ""))) {
      throw createHttpError.BadRequest("PIN must be exactly 4 digits.");
    }

    if (user.appLockEnabled) {
      if (!/^\d{4}$/.test(String(currentPin || ""))) {
        throw createHttpError.BadRequest("Current PIN is required to change PIN.");
      }

      const currentPinValid = await bcrypt.compare(
        String(currentPin),
        user.appLockPinHash || ""
      );
      if (!currentPinValid) {
        throw createHttpError.Unauthorized("Current PIN is incorrect.");
      }
    }

    const salt = await bcrypt.genSalt(12);
    const pinHash = await bcrypt.hash(String(pin), salt);

    updates.appLockEnabled = true;
    updates.appLockPinHash = pinHash;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true });
  if (!updatedUser) throw createHttpError.NotFound("User not found.");
  return updatedUser;
};

export const verifyAppLockPin = async (userId, pin) => {
  const user = await UserModel.findById(userId).select("appLockEnabled appLockPinHash");
  if (!user) throw createHttpError.NotFound("User not found.");

  if (!user.appLockEnabled) {
    return { valid: true, appLockEnabled: false };
  }

  if (!/^\d{4}$/.test(String(pin || ""))) {
    throw createHttpError.BadRequest("PIN must be exactly 4 digits.");
  }

  const valid = await bcrypt.compare(String(pin), user.appLockPinHash || "");
  if (!valid) {
    throw createHttpError.Unauthorized("Invalid app lock PIN.");
  }

  return { valid: true, appLockEnabled: true };
};
