import createHttpError from "http-errors";
import { ConversationModel, UserModel } from "../models/index.js";
import bcrypt from "bcrypt";

const sanitizePhone = (value = "") => String(value).replace(/[^\d+]/g, "");

const normalizeCountryCode = (value = "") => {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "+1";
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned.replace(/\D/g, "")}`;
};

const normalizeContactPhone = (countryCode, phone) => {
  const raw = sanitizePhone(phone);
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;

  const code = normalizeCountryCode(countryCode).replace(/\D/g, "");
  const digits = raw.replace(/\D/g, "");
  return `+${code}${digits}`;
};

export const mapContacts = (user) => {
  const contacts = Array.isArray(user?.contacts) ? user.contacts : [];

  return contacts.map((contact) => {
    const linkedUser = contact?.user;
    const linkedUserId = linkedUser?._id || linkedUser || null;
    return {
      _id: contact?._id,
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      nickname: contact?.nickname || "",
      countryCode: contact?.countryCode || "+1",
      phone: contact?.phone || "",
      syncToPhone: Boolean(contact?.syncToPhone),
      picture: contact?.picture || linkedUser?.picture || "",
      user: linkedUserId
        ? {
            _id: String(linkedUserId),
            name: linkedUser?.name || "",
            phone: linkedUser?.phone || "",
            picture: linkedUser?.picture || "",
            status: linkedUser?.status || "",
          }
        : null,
    };
  });
};

export const mapNotificationSettings = (user) => {
  const settings = user?.notificationSettings || {};
  return {
    muteAllNotifications: Boolean(settings.muteAllNotifications),
    muteLoginNotifications: Boolean(settings.muteLoginNotifications),
    mutedConversations: Array.isArray(settings.mutedConversations)
      ? settings.mutedConversations.map((id) => String(id))
      : [],
  };
};

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

export const listUsersForSelection = async (userId) => {
  const users = await UserModel.find({
    _id: { $ne: userId },
  })
    .select("name phone picture status")
    .sort({ name: 1, createdAt: -1 });

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

export const getUserNotificationSettings = async (userId) => {
  const user = await UserModel.findById(userId).select("notificationSettings");
  if (!user) throw createHttpError.NotFound("User not found.");
  return mapNotificationSettings(user);
};

export const updateUserNotificationSettings = async (userId, values) => {
  const { muteAllNotifications, muteLoginNotifications } = values;
  const updates = {};

  if (typeof muteAllNotifications === "boolean") {
    updates["notificationSettings.muteAllNotifications"] = muteAllNotifications;
  }

  if (typeof muteLoginNotifications === "boolean") {
    updates["notificationSettings.muteLoginNotifications"] = muteLoginNotifications;
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true }
  ).select("notificationSettings");

  if (!user) throw createHttpError.NotFound("User not found.");
  return mapNotificationSettings(user);
};

export const setConversationMuteForUser = async (userId, conversationId, muted) => {
  const conversation = await ConversationModel.findById(conversationId).select("users");
  if (!conversation) throw createHttpError.NotFound("Conversation not found.");

  const isParticipant = conversation.users.some(
    (participantId) => String(participantId) === String(userId)
  );

  if (!isParticipant) {
    throw createHttpError.Forbidden("You are not part of this conversation.");
  }

  const update = muted
    ? { $addToSet: { "notificationSettings.mutedConversations": conversationId } }
    : { $pull: { "notificationSettings.mutedConversations": conversationId } };

  const user = await UserModel.findByIdAndUpdate(userId, update, { new: true }).select(
    "notificationSettings"
  );

  if (!user) throw createHttpError.NotFound("User not found.");
  return mapNotificationSettings(user);
};

export const getUserContacts = async (userId) => {
  const user = await UserModel.findById(userId)
    .select("contacts")
    .populate("contacts.user", "name phone picture status");

  if (!user) throw createHttpError.NotFound("User not found.");
  return mapContacts(user);
};

export const createOrUpdateContact = async (userId, values) => {
  const firstName = String(values?.firstName || "").trim();
  const lastName = String(values?.lastName || "").trim();
  const countryCode = normalizeCountryCode(values?.countryCode || "+1");
  const syncToPhone = Boolean(values?.syncToPhone);
  const normalizedPhone = normalizeContactPhone(countryCode, values?.phone || "");

  if (!firstName) {
    throw createHttpError.BadRequest("First name is required.");
  }

  if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) {
    throw createHttpError.BadRequest("Please provide a valid phone number.");
  }

  const me = await UserModel.findById(userId).select("contacts");
  if (!me) throw createHttpError.NotFound("User not found.");

  const existingUser = await UserModel.findOne({
    phone: normalizedPhone,
    _id: { $ne: userId },
  }).select("_id name phone picture status");

  const contactPayload = {
    firstName,
    lastName,
    countryCode,
    phone: normalizedPhone,
    syncToPhone,
    picture: existingUser?.picture || "",
  };

  if (existingUser?._id) {
    contactPayload.user = existingUser._id;
  }

  const existingIndex = me.contacts.findIndex(
    (contact) => String(contact.phone) === normalizedPhone
  );

  if (existingIndex >= 0) {
    const previousNickname = me.contacts[existingIndex]?.nickname || "";
    me.contacts[existingIndex] = {
      ...me.contacts[existingIndex].toObject(),
      ...contactPayload,
      nickname: previousNickname,
    };
  } else {
    me.contacts.push(contactPayload);
  }

  await me.save();

  const populated = await UserModel.findById(userId)
    .select("contacts")
    .populate("contacts.user", "name phone picture status");

  if (!populated) throw createHttpError.NotFound("User not found.");

  const mappedContacts = mapContacts(populated);
  const matched = mappedContacts.find((c) => c.phone === normalizedPhone);
  return {
    contact: matched || null,
    contacts: mappedContacts,
  };
};

export const updateContactNickname = async (userId, contactId, nickname) => {
  const me = await UserModel.findById(userId).select("contacts");
  if (!me) throw createHttpError.NotFound("User not found.");

  const targetContact = me.contacts.id(contactId);
  if (!targetContact) {
    throw createHttpError.NotFound("Contact not found.");
  }

  targetContact.nickname = String(nickname || "").trim();
  await me.save();

  const populated = await UserModel.findById(userId)
    .select("contacts")
    .populate("contacts.user", "name phone picture status");

  if (!populated) throw createHttpError.NotFound("User not found.");
  const mappedContacts = mapContacts(populated);
  const updatedContact = mappedContacts.find(
    (contact) => String(contact._id) === String(contactId)
  );

  return {
    contact: updatedContact || null,
    contacts: mappedContacts,
  };
};
