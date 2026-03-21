import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const callSchema = mongoose.Schema(
  {
    conversation: {
      type: ObjectId,
      ref: "ConversationModel",
      required: true,
    },
    caller: {
      type: ObjectId,
      ref: "UserModel",
      required: true,
    },
    receiver: {
      type: ObjectId,
      ref: "UserModel",
      required: true,
    },
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
      default: "video",
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "completed", "rejected", "missed", "cancelled"],
      default: "ringing",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "calls",
    timestamps: true,
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ conversation: 1, createdAt: -1 });

const CallModel =
  mongoose.models.CallModel || mongoose.model("CallModel", callSchema);

export default CallModel;
