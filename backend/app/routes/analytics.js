// routes/analytics.js
// Routes cho analytics và reports

import express from "express";
import {
  getRealtimeAnalytics,
  getHistoricalReports,
  getUserJourney,
  getPageAnalytics,
  getEventAnalytics,
} from "../api/analyticsApi.js";
import { authenticateCustomer } from "../middlewares/authenticateCustomer.js";

const router = express.Router();

// All routes require customer authentication
router.use(authenticateCustomer);

router.get("/realtime/:websiteId", getRealtimeAnalytics);
router.get("/reports/:websiteId", getHistoricalReports);
router.get("/user-journey/:userId", getUserJourney);
router.get("/pages/:websiteId", getPageAnalytics);
router.get("/events/:websiteId", getEventAnalytics);

export default router;
