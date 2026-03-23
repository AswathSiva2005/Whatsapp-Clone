import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
    },
    email: {
      type: String,
      required: [true, "Please provide tour email address"],
      unique: [true, "This email address already exist"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Please provide your phone number"],
      unique: [true, "This phone number already exists"],
      trim: true,
      validate: {
        validator: (value) => /^\+?[1-9]\d{9,14}$/.test(value),
        message: "Please provide a valid phone number",
      },
    },
    picture: {
      type: String,
      default:
        "https://res.cloudinary.com/dkd5jblv5/image/upload/v1675976806/Default_ProfilePicture_gjngnb.png",
    },
    status: {
      type: String,
      default: "Hey there ! I am using whatsapp",
    },
    password: {
      type: String,
      required: [true, "Please provide your password"],
      minLength: [
        6,
        "Plase make sure your password is atleast 6 characters long",
      ],
      maxLength: [
        128,
        "Plase make sure your password is less than 128 characters long",
      ],
    },
    blockedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "UserModel",
      default: [],
    },
    appLockEnabled: {
      type: Boolean,
      default: false,
    },
    appLockPinHash: {
      type: String,
      default: "",
    },
    notificationSettings: {
      muteAllNotifications: {
        type: Boolean,
        default: false,
      },
      muteLoginNotifications: {
        type: Boolean,
        default: false,
      },
      mutedConversations: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ConversationModel",
        },
      ],
    },
    contacts: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserModel",
          default: null,
        },
        firstName: {
          type: String,
          trim: true,
          default: "",
        },
        lastName: {
          type: String,
          trim: true,
          default: "",
        },
        countryCode: {
          type: String,
          trim: true,
          default: "+1",
        },
        phone: {
          type: String,
          required: true,
          trim: true,
        },
        nickname: {
          type: String,
          trim: true,
          default: "",
        },
        picture: {
          type: String,
          default: "",
        },
        syncToPhone: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    collection: "users",
    timestamps: true,
  }
);
userSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    }
    next();
  } catch (error) {
    next(error);
  }
});
const UserModel =
  mongoose.models.UserModel || mongoose.model("UserModel", userSchema);

export default UserModel;
