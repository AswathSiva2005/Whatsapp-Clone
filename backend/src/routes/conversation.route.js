import express from "express";
import trimRequest from "trim-request";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  addGroupMembers,
  exitGroup,
  getGroupDetails,
  removeGroupMember,
  setDisappearingMessages,
  updateGroup,
  createGroup,
  create_open_conversation,
  getConversations,
  clearChat,
  deleteConversation,
} from "../controllers/conversation.controller.js";
const router = express.Router();

router
  .route("/")
  .post(trimRequest.all, authMiddleware, create_open_conversation);
router.route("/").get(trimRequest.all, authMiddleware, getConversations);
router.route("/group").post(trimRequest.all, authMiddleware, createGroup);
router
  .route("/group/:conversationId")
  .get(trimRequest.all, authMiddleware, getGroupDetails)
  .patch(trimRequest.all, authMiddleware, updateGroup);
router
  .route("/group/:conversationId/members")
  .post(trimRequest.all, authMiddleware, addGroupMembers);
router
  .route("/group/:conversationId/members/:memberId")
  .delete(trimRequest.all, authMiddleware, removeGroupMember);
router
  .route("/group/:conversationId/exit")
  .post(trimRequest.all, authMiddleware, exitGroup);
router
  .route("/:conversationId/disappearing")
  .patch(trimRequest.all, authMiddleware, setDisappearingMessages);
router.route("/clear").post(trimRequest.all, authMiddleware, clearChat);
router.route("/delete").post(trimRequest.all, authMiddleware, deleteConversation);

export default router;
