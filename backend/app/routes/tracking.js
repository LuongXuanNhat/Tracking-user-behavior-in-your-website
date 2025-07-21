// routes/tracking.js
import express from "express";
import { TrackingAPI } from "../api/trackingApi.js";

const router = express.Router();

/**
 * POST /api/tracking/event
 * Ghi nhận hành vi người dùng
 */
router.post("/event", TrackingAPI.createEvent);

/**
 * POST /api/tracking/batch
 * Ghi nhận nhiều hành vi cùng lúc
 */
router.post("/batch", TrackingAPI.createBatchEvents);

/**
 * GET /api/tracking/events
 * Lấy danh sách các events với filter
 */
router.get("/events", TrackingAPI.getEvents);

export default router;
