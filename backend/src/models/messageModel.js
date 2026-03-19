import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = mongoose.Schema(
  {
    sender: {
      type: ObjectId,
      ref: "UserModel",
    },
    message: {
      type: String,
      trim: true,
    },
    conversation: {
      type: ObjectId,
      ref: "ConversationModel",
    },
    files: [],
    poll: {
      question: {
        type: String,
        trim: true,
      },
      options: [
        {
          label: {
            type: String,
            trim: true,
          },
          votes: [
            {
              type: ObjectId,
              ref: "UserModel",
            },
          ],
        },
      ],
      allowMultipleAnswers: {
        type: Boolean,
        default: false,
      },
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    starredBy: [
      {
        type: ObjectId,
        ref: "UserModel",
      },
    ],
    deletedFor: [
      {
        type: ObjectId,
        ref: "UserModel",
      },
    ],
  },
  {
    collection: "messages",
    timestamps: true,
  }
);

const MessageModel =
  mongoose.models.MessageModel || mongoose.model("MessageModel", messageSchema);

export default MessageModel;
