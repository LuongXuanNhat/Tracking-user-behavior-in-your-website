// routes/website.js
import express from "express";
import { WebsiteAPI } from "../api/websiteApi.js";
import { requireApiKey, requirePermission } from "../middlewares/apikey.js";

const router = express.Router();

/**
 * GET /api/websites
 * Lấy tất cả websites
 */
router.get("/", requireApiKey, WebsiteAPI.getAllWebsites);

/**
 * POST /api/websites
 * Tạo website mới với API key
 */
router.post(
  "/",
  requireApiKey,
  requirePermission("users"),
  WebsiteAPI.createWebsite
);

/**
 * GET /api/websites/stats
 * Lấy thống kê websites
 */
router.get("/stats", requireApiKey, WebsiteAPI.getWebsiteStats);

/**
 * GET /api/websites/:id
 * Lấy thông tin website theo ID
 */
router.get("/:id", requireApiKey, WebsiteAPI.getWebsiteById);

/**
 * PUT /api/websites/:id
 * Cập nhật website
 */
router.put(
  "/:id",
  requireApiKey,
  requirePermission("users"),
  WebsiteAPI.updateWebsite
);

/**
 * DELETE /api/websites/:id
 * Xóa website
 */
router.delete(
  "/:id",
  requireApiKey,
  requirePermission("users"),
  WebsiteAPI.deleteWebsite
);

/**
 * POST /api/websites/:id/regenerate-key
 * Tạo lại API key cho website
 */
router.post(
  "/:id/regenerate-key",
  requireApiKey,
  requirePermission("users"),
  WebsiteAPI.regenerateApiKey
);

export default router;
