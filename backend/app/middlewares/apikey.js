/* eslint-disable no-undef */
// middlewares/apikey.js
import NodeCache from "node-cache";
import { Website } from "../models/Website.js";

// Cache với TTL = 5 phút và check period mỗi 2 phút
const apiKeyCache = new NodeCache({
  stdTTL: 300, // 5 phút
  checkperiod: 120, // Check expired keys mỗi 2 phút
  useClones: false, // Tránh deep clone, tăng performance
});

// Cache cho invalid API keys (ngăn spam attack)
const invalidKeyCache = new NodeCache({
  stdTTL: 60, // Cache invalid key trong 1 phút
  checkperiod: 30,
});

// Circuit breaker để ngăn database overload
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: null,
  isOpen: false,
  threshold: 5, // Số lỗi liên tiếp để mở circuit
  timeout: 30000, // 30s timeout khi circuit mở
};

function resetCircuitBreaker() {
  circuitBreakerState.failures = 0;
  circuitBreakerState.isOpen = false;
  circuitBreakerState.lastFailureTime = null;
}

function tripCircuitBreaker() {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();

  if (circuitBreakerState.failures >= circuitBreakerState.threshold) {
    circuitBreakerState.isOpen = true;
    console.warn(
      `🔥 Circuit breaker OPENED after ${circuitBreakerState.failures} failures`
    );
  }
}

function shouldAllowRequest() {
  if (!circuitBreakerState.isOpen) return true;

  const timeSinceLastFailure = Date.now() - circuitBreakerState.lastFailureTime;
  if (timeSinceLastFailure > circuitBreakerState.timeout) {
    console.log("🔄 Circuit breaker attempting half-open state");
    return true; // Try half-open state
  }

  return false;
}

/**
 * Middleware kiểm tra API Key với cache optimization
 */
export async function validateApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        status: "error",
        message: "API key is required",
        error: "Missing API key in request headers (x-api-key)",
      });
    }

    // 1. Check environment keys (cao nhất)
    const envKeys = [
      process.env.DEMO_API_KEY,
      process.env.TEST_API_KEY,
      process.env.PRODUCTION_API_KEY,
    ];

    if (envKeys.includes(apiKey)) {
      req.apiKeyValidated = true;
      req.apiKeySource = "environment";
      return next();
    }

    // 2. Check invalid key cache trước (tránh spam)
    if (invalidKeyCache.get(apiKey)) {
      return res.status(401).json({
        status: "error",
        message: "Invalid API key",
      });
    }

    // 3. Check valid cache
    let website = apiKeyCache.get(apiKey);
    if (website) {
      // Kiểm tra lại status từ cache (có thể đã bị suspend)
      if (website.status !== "active") {
        // Remove khỏi cache nếu không active
        apiKeyCache.del(apiKey);
        return res.status(403).json({
          status: "error",
          message: "Website access suspended",
          error: `Website status is ${website.status}`,
        });
      }

      req.website = website;
      req.apiKeyValidated = true;
      req.apiKeySource = "cache";
      return next();
    }

    // 4. Query database với circuit breaker protection
    if (!shouldAllowRequest()) {
      console.warn("🔥 Circuit breaker is OPEN - rejecting request");
      return res.status(503).json({
        status: "error",
        message: "Service temporarily unavailable",
        error: "Database circuit breaker is open",
      });
    }

    console.log(`Cache miss for API key: ${apiKey.substring(0, 8)}...`);

    // Tối ưu: chỉ gọi 1 query thay vì 2 queries
    website = await Website.findByApiKey(apiKey);

    if (!website) {
      tripCircuitBreaker(); // Record failure
      // Cache invalid key để tránh spam
      invalidKeyCache.set(apiKey, true);
      return res.status(401).json({
        status: "error",
        message: "Invalid API key",
        error: "The provided API key is not valid or has been revoked",
      });
    }

    // Success - reset circuit breaker if it was in failure state
    if (circuitBreakerState.failures > 0) {
      resetCircuitBreaker();
      console.log("✅ Circuit breaker reset after successful request");
    }

    // Check website status
    if (website.status !== "active") {
      // Không cache inactive website
      return res.status(403).json({
        status: "error",
        message: "Website access suspended",
        error: `Website status is ${website.status}`,
      });
    }

    // 5. Cache valid website
    apiKeyCache.set(apiKey, website);

    req.website = website;
    req.apiKeyValidated = true;
    req.apiKeySource = "database";

    next();
  } catch (error) {
    console.error("API key validation error:", error);

    // Trip circuit breaker on database errors
    if (
      error.name === "OperationTimedOutError" ||
      error.name === "NoHostAvailableError" ||
      error.message.includes("timeout")
    ) {
      tripCircuitBreaker();
      console.error(
        `🔥 Circuit breaker failure count: ${circuitBreakerState.failures}`
      );
    }

    // Log chi tiết để debug
    if (error.name === "OperationTimedOutError") {
      console.error(
        "Database timeout - consider connection pooling optimization"
      );
    }

    res.status(500).json({
      status: "error",
      message: "API key validation error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
}

/**
 * Utility functions để quản lý cache
 */
export const apiKeyMiddlewareUtils = {
  // Clear cache cho một API key cụ thể
  clearCache: (apiKey) => {
    apiKeyCache.del(apiKey);
    invalidKeyCache.del(apiKey);
  },

  // Clear toàn bộ cache
  clearAllCache: () => {
    apiKeyCache.flushAll();
    invalidKeyCache.flushAll();
  },

  // Lấy thống kê cache
  getCacheStats: () => ({
    validCache: {
      keys: apiKeyCache.keys().length,
      stats: apiKeyCache.getStats(),
    },
    invalidCache: {
      keys: invalidKeyCache.keys().length,
      stats: invalidKeyCache.getStats(),
    },
  }),

  // Pre-warm cache (có thể dùng khi startup)
  preWarmCache: async (apiKeys = []) => {
    console.log(`Pre-warming cache for ${apiKeys.length} API keys...`);
    const promises = apiKeys.map(async (apiKey) => {
      try {
        const website = await Website.findByApiKey(apiKey);
        if (website && website.status === "active") {
          apiKeyCache.set(apiKey, website);
        }
      } catch (error) {
        console.error(`Failed to pre-warm cache for key: ${apiKey}`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log("Cache pre-warming completed");
  },

  // Reset circuit breaker manually
  resetCircuitBreaker: () => {
    resetCircuitBreaker();
    console.log("🔄 Circuit breaker manually reset");
  },

  // Get circuit breaker status
  getCircuitBreakerStatus: () => ({
    isOpen: circuitBreakerState.isOpen,
    failures: circuitBreakerState.failures,
    lastFailureTime: circuitBreakerState.lastFailureTime,
    threshold: circuitBreakerState.threshold,
    timeout: circuitBreakerState.timeout,
  }),
};
