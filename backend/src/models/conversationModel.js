import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;
const conversationSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Conversations name is required."],
      trim: true,
    },
    picture: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    isGroup: {
      type: Boolean,
      required: true,
      default: false,
    },
    users: [
      {
        type: ObjectId,
        ref: "UserModel",
      },
    ],
    latestMessage: {
      type: ObjectId,
      ref: "MessageModel",
    },
    admin: {
      type: ObjectId,
      ref: "UserModel",
    },
    disappearingSettings: [
      {
        user: {
          type: ObjectId,
          ref: "UserModel",
          required: true,
        },
        mode: {
          type: String,
          enum: ["off", "timed"],
          default: "off",
        },
        seconds: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    collection: "conversations",
    timestamps: true,
  }
);

const ConversationModel =
  mongoose.models.ConversationModel ||
  mongoose.model("ConversationModel", conversationSchema);

export default ConversationModel;
