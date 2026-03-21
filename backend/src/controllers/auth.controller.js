import createHttpError from "http-errors";
import { createUser, signUser } from "../services/auth.service.js";
import { generateToken, verifyToken } from "../services/token.service.js";
import { findUser } from "../services/user.service.js";
import logger from "../configs/logger.config.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, picture, status, password } = req.body;
    const newUser = await createUser({
      name,
      email,
      phone,
      picture,
      status,
      password,
    });
    const access_token = await generateToken(
      { userId: newUser._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refresh_token = await generateToken(
      { userId: newUser._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshtoken", refresh_token, {
      httpOnly: true,
      path: "/api/v1/auth/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    res.json({
      message: "register success.",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        picture: newUser.picture,
        status: newUser.status,
        blockedUsers: newUser.blockedUsers || [],
        token: access_token,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await signUser(email, password);
    const access_token = await generateToken(
      { userId: user._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    const refresh_token = await generateToken(
      { userId: user._id },
      "30d",
      process.env.REFRESH_TOKEN_SECRET
    );

    res.cookie("refreshtoken", refresh_token, {
      httpOnly: true,
      path: "/api/v1/auth/refreshtoken",
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    });

    res.json({
      message: "register success.",
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        picture: user.picture,
        status: user.status,
        blockedUsers: user.blockedUsers || [],
        token: access_token,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const logout = async (req, res, next) => {
  try {
    res.clearCookie("refreshtoken", { path: "/api/v1/auth/refreshtoken" });
    res.json({
      message: "logged out !",
    });
  } catch (error) {
    next(error);
  }
};
export const refreshToken = async (req, res, next) => {
  try {
    const refresh_token = req.cookies.refreshtoken;
    if (!refresh_token) throw createHttpError.Unauthorized("Please login.");
    const check = await verifyToken(
      refresh_token,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await findUser(check.userId);
    const access_token = await generateToken(
      { userId: user._id },
      "1d",
      process.env.ACCESS_TOKEN_SECRET
    );
    res.json({
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        picture: user.picture,
        status: user.status,
        token: access_token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadRegisterPicture = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      throw createHttpError.BadRequest("No file provided.");
    }

    const file = req.files.file;
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
      const normalizedProtocol = protocol === "http" ? "https" : protocol;
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

      return res.status(200).json({
        message: "Picture uploaded successfully.",
        url: response.data.secure_url,
        secure_url: response.data.secure_url,
        public_id: response.data.public_id,
        original_filename: response.data.original_filename,
        bytes: response.data.bytes,
        format: response.data.format,
      });
    } catch (cloudinaryError) {
      logger.error(
        "Cloudinary register upload error:",
        cloudinaryError.response?.data || cloudinaryError.message
      );
      return saveLocalAndRespond();
    }
  } catch (error) {
    next(error);
  }
};
