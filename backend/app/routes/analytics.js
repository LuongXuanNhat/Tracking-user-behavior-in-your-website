// routes/analytics.js
import express from "express";
import { AnalyticsAPI } from "../api/analyticsApi.js";
import { requireApiKey } from "../middlewares/apikey.js";

const router = express.Router();

/**
 * GET /api/analytics/clicks
 * Thống kê lượt click theo element type (ảnh, bài đánh giá, bài blog)
 * Yêu cầu API key
 */
router.get("/clicks", requireApiKey, AnalyticsAPI.getClickAnalytics);

/**
 * GET /api/analytics/views
 * Thống kê lượt xem trang
 * Yêu cầu API key
 */
router.get("/views", requireApiKey, AnalyticsAPI.getViewAnalytics);

/**
 * GET /api/analytics/popular-services
 * Phân tích dịch vụ nào phổ biến nhất / ít dùng nhất
 * Yêu cầu API key
 */
router.get("/popular-services", requireApiKey, AnalyticsAPI.getPopularServices);

/**
 * GET /api/analytics/dashboard
 * Tổng hợp dashboard chính
 * Yêu cầu API key
 */
router.get("/dashboard", requireApiKey, AnalyticsAPI.getDashboard);

export default router;
