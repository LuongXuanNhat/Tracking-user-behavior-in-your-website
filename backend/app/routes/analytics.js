// routes/analytics.js
import express from "express";
import { AnalyticsAPI } from "../api/analyticsApi.js";

const router = express.Router();

/**
 * GET /api/analytics/clicks
 * Thống kê lượt click theo element type (ảnh, bài đánh giá, bài blog)
 */
router.get("/clicks", AnalyticsAPI.getClickAnalytics);

/**
 * GET /api/analytics/views
 * Thống kê lượt xem trang
 */
router.get("/views", AnalyticsAPI.getViewAnalytics);

/**
 * GET /api/analytics/popular-services
 * Phân tích dịch vụ nào phổ biến nhất / ít dùng nhất
 */
router.get("/popular-services", AnalyticsAPI.getPopularServices);

/**
 * GET /api/analytics/dashboard
 * Tổng hợp dashboard chính
 */
router.get("/dashboard", AnalyticsAPI.getDashboard);

export default router;
