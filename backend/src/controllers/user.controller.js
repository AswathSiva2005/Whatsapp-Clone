import createHttpError from "http-errors";
import logger from "../configs/logger.config.js";
import {
  searchUsers as searchUsersService,
  searchByPhone,
  updateUserProfile,
  blockUser,
  unblockUser,
  configureAppLock,
  verifyAppLockPin,
  getUserNotificationSettings,
  mapNotificationSettings,
  setConversationMuteForUser,
  updateUserNotificationSettings,
} from "../services/user.service.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.search;
    if (!keyword) {
      logger.error("Please add a search query first");
      throw createHttpError.BadRequest("Please add a search query.");
    }
    const users = await searchUsersService(keyword, req.user.userId);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const searchUserByPhone = async (req, res, next) => {
  try {
    const phone = req.query.phone;
    if (!phone) {
      throw createHttpError.BadRequest("Phone number required.");
    }
    const user = await searchByPhone(phone, req.user.userId);
    res.status(200).json(user ? [user] : []);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, status, picture } = req.body;
    const updatedUser = await updateUserProfile(req.user.userId, {
      name,
      status,
      picture,
    });
    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        picture: updatedUser.picture,
        status: updatedUser.status,
        appLockEnabled: Boolean(updatedUser.appLockEnabled),
        notificationSettings: mapNotificationSettings(updatedUser),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const blockUserHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const updatedUser = await blockUser(req.user.userId, userId);
    res.status(200).json({ 
      message: "User blocked successfully.",
      user: {
        _id: updatedUser._id,
        blockedUsers: updatedUser.blockedUsers || [],
      }
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUserHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const updatedUser = await unblockUser(req.user.userId, userId);
    res.status(200).json({ 
      message: "User unblocked successfully.",
      user: {
        _id: updatedUser._id,
        blockedUsers: updatedUser.blockedUsers || [],
      }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      logger.error("No file provided in request");
      throw createHttpError.BadRequest("No file provided.");
    }

    const file = req.files.file;
    logger.info(`Uploading file: ${file.name}, size: ${file.size}`);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    let buffer = file.data;
    if ((!buffer || !buffer.length) && file.tempFilePath) {
      buffer = fs.readFileSync(file.tempFilePath);
    }

    if (!buffer || !buffer.length) {
      throw createHttpError.InternalServerError("Failed to process uploaded file.");
    }

    const saveLocalAndRespond = () => {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const extensionFromName = path.extname(file.name || "");
      const extensionFromMime = (file.mimetype || "image/jpeg").split("/")[1] || "jpg";
      const extension = extensionFromName || `.${extensionFromMime}`;
      const fileName = `${randomUUID()}${extension}`;
      const savedPath = path.join(uploadsDir, fileName);

      fs.writeFileSync(savedPath, buffer);

      const forwardedProto = req.headers["x-forwarded-proto"];
      const protocol =
        (Array.isArray(forwardedProto)
          ? forwardedProto[0]
          : String(forwardedProto || "").split(",")[0]) || req.protocol;
      const normalizedProtocol = protocol || "http";
      const fileUrl = `${normalizedProtocol}://${req.get("host")}/uploads/${fileName}`;
      res.status(200).json({
        message: "Picture uploaded successfully.",
        url: fileUrl,
        secure_url: fileUrl,
        public_id: fileName,
        original_filename: path.basename(file.name || fileName, path.extname(fileName)),
        bytes: file.size,
        format: extension.replace(".", ""),
      });
    };

    if (!cloudName || !uploadPreset) {
      return saveLocalAndRespond();
    }

    const form = new FormData();
    if (file.tempFilePath) {
      form.append("file", fs.createReadStream(file.tempFilePath));
    } else {
      form.append("file", buffer, file.name);
    }
    form.append("upload_preset", uploadPreset);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        form,
        {
          headers: form.getHeaders(),
        }
      );

      logger.info(`File uploaded successfully to Cloudinary: ${response.data.secure_url}`);
      res.status(200).json({
        message: "Picture uploaded successfully.",
        url: response.data.secure_url,
        secure_url: response.data.secure_url,
        public_id: response.data.public_id,
        original_filename: response.data.original_filename,
        bytes: response.data.bytes,
        format: response.data.format,
      });
    } catch (cloudinaryError) {
      logger.error("Cloudinary upload error:", cloudinaryError.response?.data || cloudinaryError.message);
      return saveLocalAndRespond();
    }
  } catch (error) {
    logger.error("Upload error:", error.message);
    next(error);
  }
};

export const configureAppLockHandler = async (req, res, next) => {
  try {
    const { enabled, pin, currentPin } = req.body;
    const updatedUser = await configureAppLock(req.user.userId, {
      enabled,
      pin,
      currentPin,
    });

    res.status(200).json({
      message: updatedUser.appLockEnabled
        ? "App lock updated successfully."
        : "App lock disabled successfully.",
      user: {
        _id: updatedUser._id,
        appLockEnabled: Boolean(updatedUser.appLockEnabled),
        notificationSettings: mapNotificationSettings(updatedUser),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAppLockHandler = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const result = await verifyAppLockPin(req.user.userId, pin);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getNotificationSettingsHandler = async (req, res, next) => {
  try {
    const settings = await getUserNotificationSettings(req.user.userId);
    res.status(200).json({ notificationSettings: settings });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationSettingsHandler = async (req, res, next) => {
  try {
    const { muteAllNotifications, muteLoginNotifications } = req.body;
    const settings = await updateUserNotificationSettings(req.user.userId, {
      muteAllNotifications,
      muteLoginNotifications,
    });

    res.status(200).json({
      message: "Notification settings updated.",
      user: {
        _id: req.user.userId,
        notificationSettings: settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const setConversationMuteHandler = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { muted } = req.body;

    if (typeof muted !== "boolean") {
      throw createHttpError.BadRequest("muted must be a boolean.");
    }

    const settings = await setConversationMuteForUser(
      req.user.userId,
      conversationId,
      muted
    );

    res.status(200).json({
      message: muted ? "Conversation muted." : "Conversation unmuted.",
      user: {
        _id: req.user.userId,
        notificationSettings: settings,
      },
    });
  } catch (error) {
    next(error);
  }
};
