// routes/apikey.js
// Routes cho API key management

import express from "express";
import {
  createApiKey,
  getApiKeys,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  validateApiKey,
  regenerateApiKey,
  getApiKeyStats,
} from "../api/apiKeyApi.js";
import { authenticateCustomer } from "../middlewares/authenticateCustomer.js";

const router = express.Router();

// Public route for validation
router.post("/validate", validateApiKey);

// Protected routes
router.use(authenticateCustomer);

router.post("/", createApiKey);
router.get("/", getApiKeys);
router.get("/stats", getApiKeyStats);
router.get("/:id", getApiKey);
router.put("/:id", updateApiKey);
router.delete("/:id", deleteApiKey);
router.post("/:id/regenerate", regenerateApiKey);

export default router;
