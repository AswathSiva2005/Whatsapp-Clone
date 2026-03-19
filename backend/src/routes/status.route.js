import express from "express";
import trimRequest from "trim-request";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createStatusHandler,
  deleteStatusHandler,
  getStatusFeedHandler,
  replyStatusHandler,
  toggleLikeStatusHandler,
  viewStatusHandler,
} from "../controllers/status.controller.js";

const router = express.Router();

router.route("/").post(trimRequest.all, authMiddleware, createStatusHandler);
router.route("/").get(trimRequest.all, authMiddleware, getStatusFeedHandler);
router
  .route("/:statusId/like")
  .patch(trimRequest.all, authMiddleware, toggleLikeStatusHandler);
router
  .route("/:statusId/reply")
  .post(trimRequest.all, authMiddleware, replyStatusHandler);
router
  .route("/:statusId/view")
  .post(trimRequest.all, authMiddleware, viewStatusHandler);
router.route("/:statusId").delete(trimRequest.all, authMiddleware, deleteStatusHandler);

export default router;
