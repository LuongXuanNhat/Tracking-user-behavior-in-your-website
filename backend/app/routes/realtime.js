// routes/realtime.js
// Routes for realtime events

import express from "express";
import * as realtimeApi from "../api/realtimeApi.js";
import { authenticateUser } from "../middlewares/authenticate.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * GET /api/realtime/events/:websiteId
 * Lấy events realtime với pagination
 */
router.get("/events/:websiteId", realtimeApi.getRealtimeEvents);

/**
 * GET /api/realtime/events/:websiteId/range
 * Lấy events realtime theo date range
 */
router.get(
  "/events/:websiteId/range",
  realtimeApi.getRealtimeEventsByDateRange
);

/**
 * GET /api/realtime/events/:websiteId/stream
 * Stream events realtime - events trong vài phút gần nhất
 */
router.get("/events/:websiteId/stream", realtimeApi.streamRealtimeEvents);

export default router;
