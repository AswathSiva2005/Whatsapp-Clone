import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const statusReplySchema = new mongoose.Schema(
  {
    from: {
      type: ObjectId,
      ref: "UserModel",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    likes: [
      {
        type: ObjectId,
        ref: "UserModel",
      },
    ],
    viewers: [
      {
        type: ObjectId,
        ref: "UserModel",
      },
    ],
    replies: [statusReplySchema],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  {
    collection: "statuses",
    timestamps: true,
  }
);

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const StatusModel =
  mongoose.models.StatusModel || mongoose.model("StatusModel", statusSchema);

export default StatusModel;
