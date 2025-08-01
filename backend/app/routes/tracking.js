// routes/tracking.js
// Routes cho tracking events

import express from "express";
import {
  collectEvent,
  collectBatchEvents,
  getEventsByUser,
  getEventsBySession,
  getEventsByDateRange,
  getDailyEventStats,
  getTopPages,
  trackingHealthCheck,
} from "../api/trackingApi.js";

const router = express.Router();

// Public routes (chỉ cần API key validation tại controller)
router.post("/events", collectEvent);
router.post("/events/batch", collectBatchEvents);
router.get("/health", trackingHealthCheck);

// Protected routes for analytics
router.get("/events", getEventsByDateRange);
router.get("/events/user/:userId", getEventsByUser);
router.get("/events/session/:sessionId", getEventsBySession);
router.get("/stats/daily/:date", getDailyEventStats);
router.get("/stats/top-pages", getTopPages);

export default router;
