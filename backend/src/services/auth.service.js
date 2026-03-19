import createHttpError from "http-errors";
import validator from "validator";
import bcrypt from "bcrypt";
import { UserModel } from "../models/index.js";

//env variables
const { DEFAULT_PICTURE, DEFAULT_STATUS } = process.env;

export const createUser = async (userData) => {
  const { name, email, phone, picture, status, password } = userData;
  const normalizedEmail = email?.toLowerCase();

  //check if fields are empty
  if (!name || !normalizedEmail || !phone || !password) {
    throw createHttpError.BadRequest("Please fill all fields.");
  }

  //check name length
  if (
    !validator.isLength(name, {
      min: 2,
      max: 25,
    })
  ) {
    throw createHttpError.BadRequest(
      "Plase make sure your name is between 2 and 16 characters."
    );
  }

  //Check status length
  if (status && status.length > 64) {
    throw createHttpError.BadRequest(
      "Please make sure your status is less than 64 characters."
    );
  }

  //check if email address is valid
  if (!validator.isEmail(normalizedEmail)) {
    throw createHttpError.BadRequest(
      "Please make sure to provide a valid email address."
    );
  }

  //check if phone number is valid
  if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
    throw createHttpError.BadRequest(
      "Please make sure to provide a valid phone number."
    );
  }

  //check if user already exist
  const checkEmail = await UserModel.findOne({ email: normalizedEmail });
  if (checkEmail) {
    throw createHttpError.Conflict(
      "Please try again with a different email address, this email already exist."
    );
  }

  const checkPhone = await UserModel.findOne({ phone });
  if (checkPhone) {
    throw createHttpError.Conflict(
      "Please try again with a different phone number, this phone already exist."
    );
  }

  //check password length
  if (
    !validator.isLength(password, {
      min: 6,
      max: 128,
    })
  ) {
    throw createHttpError.BadRequest(
      "Please make sure your password is between 6 and 128 characters."
    );
  }

  //adding user to databse
  const user = await new UserModel({
    name,
    email: normalizedEmail,
    phone,
    picture: picture || DEFAULT_PICTURE,
    status: status || DEFAULT_STATUS,
    password,
  }).save();

  return user;
};

export const signUser = async (email, password) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();

  //check if user exist
  if (!user) throw createHttpError.NotFound("Invalid credentials.");

  //compare passwords
  let passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) throw createHttpError.NotFound("Invalid credentials.");

  return user;
};
