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
  testBroadcast,
} from "../api/trackingApi.js";
import { validateApiKey } from "../middlewares/apikey.js";

const router = express.Router();

// Public routes (chỉ cần API key validation tại controller)
router.post("/events", validateApiKey, collectEvent);
router.post("/events/batch", validateApiKey, collectBatchEvents);
router.get("/health", validateApiKey, trackingHealthCheck);

// Test route for development
router.post("/test-broadcast", testBroadcast);

// Protected routes for analytics
router.get("/events", validateApiKey, getEventsByDateRange);
router.get("/events/visitor/:userId", validateApiKey, getEventsByUser);
router.get("/events/session/:sessionId", validateApiKey, getEventsBySession);
router.get("/stats/daily/:date", validateApiKey, getDailyEventStats);
router.get("/stats/top-pages", validateApiKey, getTopPages);

export default router;
