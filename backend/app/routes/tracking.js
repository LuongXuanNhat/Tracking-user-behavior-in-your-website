// routes/tracking.js
import express from "express";
import { TrackingAPI } from "../api/trackingApi.js";
import { requireApiKey } from "../middlewares/apikey.js";

const router = express.Router();

/**
 * POST /api/tracking/event
 * Ghi nhận hành vi người dùng
 * Yêu cầu API key
 */
router.post("/event", requireApiKey, TrackingAPI.createEvent);

/**
 * POST /api/tracking/batch
 * Ghi nhận nhiều hành vi cùng lúc
 * Yêu cầu API key
 */
router.post("/batch", requireApiKey, TrackingAPI.createBatchEvents);

/**
 * GET /api/tracking/events
 * Lấy danh sách các events với filter
 * Yêu cầu API key
 */
router.get("/events", requireApiKey, TrackingAPI.getEvents);

export default router;
