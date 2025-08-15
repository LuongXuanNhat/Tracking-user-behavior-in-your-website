// routes/website.js
// Routes cho website management

import express from "express";
import {
  createWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
  getTrackingCode,
  getWebsiteStats,
  getAllEventByWebsite,
} from "../api/websiteApi.js";
import { authenticateCustomer } from "../middlewares/authenticateCustomer.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateCustomer);

router.post("/", createWebsite);
router.get("/:id", getWebsite);
router.get("/", getWebsites);
router.get("/:website_id/events", getAllEventByWebsite);
router.get("/stats", getWebsiteStats);
router.put("/:id", updateWebsite);
router.delete("/:id", deleteWebsite);
router.get("/:id/tracking-code", getTrackingCode);

export default router;
