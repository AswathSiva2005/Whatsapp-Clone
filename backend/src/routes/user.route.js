import express from "express";
import trimRequest from "trim-request";
import {
	searchUsers,
	searchUserByPhone,
	updateProfile,
	blockUserHandler,
	unblockUserHandler,
	uploadProfilePicture,
	configureAppLockHandler,
	verifyAppLockHandler,
	getNotificationSettingsHandler,
	updateNotificationSettingsHandler,
	setConversationMuteHandler,
} from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

router.route("/").get(trimRequest.all, authMiddleware, searchUsers);
router.route("/phone").get(trimRequest.all, authMiddleware, searchUserByPhone);
router.route("/profile").put(trimRequest.all, authMiddleware, updateProfile);
router.route("/block").post(trimRequest.all, authMiddleware, blockUserHandler);
router.route("/unblock").post(trimRequest.all, authMiddleware, unblockUserHandler);
router.route("/upload").post(trimRequest.all, authMiddleware, uploadProfilePicture);
router.route("/app-lock").patch(trimRequest.all, authMiddleware, configureAppLockHandler);
router.route("/app-lock/verify").post(trimRequest.all, authMiddleware, verifyAppLockHandler);
router
	.route("/notification-settings")
	.get(trimRequest.all, authMiddleware, getNotificationSettingsHandler)
	.patch(trimRequest.all, authMiddleware, updateNotificationSettingsHandler);
router
	.route("/notification-settings/conversation/:conversationId")
	.patch(trimRequest.all, authMiddleware, setConversationMuteHandler);

export default router;
