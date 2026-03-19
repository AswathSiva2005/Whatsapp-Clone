import express from "express";
import trimRequest from "trim-request";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
	sendMessage,
	getMessages,
	toggleStarMessage,
	deleteSingleMessage,
	getStarredMessages,
} from "../controllers/message.controller.js";
const router = express.Router();

router.route("/").post(trimRequest.all, authMiddleware, sendMessage);
router.route("/starred").get(trimRequest.all, authMiddleware, getStarredMessages);
router.route("/:messageId/star").patch(trimRequest.all, authMiddleware, toggleStarMessage);
router.route("/:messageId").delete(trimRequest.all, authMiddleware, deleteSingleMessage);
router.route("/:convo_id").get(trimRequest.all, authMiddleware, getMessages);
export default router;
