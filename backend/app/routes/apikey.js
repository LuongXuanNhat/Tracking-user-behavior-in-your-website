// routes/apikey.js
// Routes cho quản lý API Keys

import express from "express";
import {
  createApiKey,
  getApiKeys,
  getApiKeyDetails,
  disableApiKey,
  extendApiKey,
  getApiKeyStats,
} from "../api/apiKeyApi.js";
import { requireApiKey, getValidApiKeys } from "../middlewares/apikey.js";

const router = express.Router();

/**
 * @route POST /api/keys
 * @desc Tạo API key mới
 * @access Private (require admin API key)
 */
router.post("/", requireApiKey, createApiKey);

/**
 * @route GET /api/keys
 * @desc Lấy danh sách API keys
 * @access Private (require admin API key)
 */
router.get("/", requireApiKey, getApiKeys);

/**
 * @route GET /api/keys/stats
 * @desc Lấy thống kê API keys
 * @access Private (require admin API key)
 */
router.get("/stats", requireApiKey, getApiKeyStats);

/**
 * @route GET /api/keys/valid
 * @desc Lấy danh sách API keys hợp lệ (dev only)
 * @access Private (require admin API key)
 */
router.get("/valid", requireApiKey, async (req, res) => {
  try {
    const validKeys = await getValidApiKeys();
    res.json({
      status: "success",
      data: validKeys,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve valid keys",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/keys/:keyId
 * @desc Lấy thông tin chi tiết API key
 * @access Private (require admin API key)
 */
router.get("/:keyId", requireApiKey, getApiKeyDetails);

/**
 * @route PUT /api/keys/:keyId/disable
 * @desc Vô hiệu hóa API key
 * @access Private (require admin API key)
 */
router.put("/:keyId/disable", requireApiKey, disableApiKey);

/**
 * @route PUT /api/keys/:keyId/extend
 * @desc Gia hạn API key
 * @access Private (require admin API key)
 */
router.put("/:keyId/extend", requireApiKey, extendApiKey);

export default router;
