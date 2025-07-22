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
 * Query params: date (YYYY-MM-DD) hoặc user_id (bắt buộc), event_type, element_type, page_url, limit, offset
 */
router.get("/events", requireApiKey, TrackingAPI.getEvents);

/**
 * GET /api/tracking/user/:user_id/events
 * Lấy tất cả events của một user cụ thể
 * Yêu cầu API key
 * Query params: start_date, end_date, event_type, limit
 */
router.get("/user/:user_id/events", requireApiKey, TrackingAPI.getUserEvents);

export default router;
