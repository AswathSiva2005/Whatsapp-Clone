import express from "express";
import trimRequest from "trim-request";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  acceptCall,
  endCall,
  getCallHistory,
  startCall,
  deleteCall,
} from "../controllers/call.controller.js";

const router = express.Router();

router.route("/").get(trimRequest.all, authMiddleware, getCallHistory);
router.route("/start").post(trimRequest.all, authMiddleware, startCall);
router.route("/:callId/accept").patch(trimRequest.all, authMiddleware, acceptCall);
router.route("/:callId/end").patch(trimRequest.all, authMiddleware, endCall);
router.route("/:callId").delete(trimRequest.all, authMiddleware, deleteCall);

export default router;
