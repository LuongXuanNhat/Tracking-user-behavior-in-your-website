// middlewares/apikey.js
// Middleware kiểm tra API Key động từ database

import { ApiKey } from "../models/ApiKey.js";

/**
 * Middleware kiểm tra API Key động
 */
export const validateApiKey = (options = {}) => {
  const {
    required = true, // Bắt buộc API key hay không
    allowPublicEndpoints = [], // Danh sách endpoints không cần API key
    checkPermissions = true, // Kiểm tra quyền truy cập
  } = options;

  return async (req, res, next) => {
    try {
      // Kiểm tra xem endpoint có trong danh sách public không
      const isPublicEndpoint = allowPublicEndpoints.some((endpoint) => {
        if (typeof endpoint === "string") {
          return req.path === endpoint;
        }
        if (endpoint instanceof RegExp) {
          return endpoint.test(req.path);
        }
        return false;
      });

      // Nếu là public endpoint, bỏ qua kiểm tra
      if (isPublicEndpoint) {
        return next();
      }

      // Lấy API key từ header hoặc query parameter
      const apiKey =
        req.headers["x-api-key"] ||
        req.headers["authorization"]?.replace("Bearer ", "") ||
        req.query.api_key;

      // Nếu không bắt buộc và không có API key, cho phép tiếp tục
      if (!required && !apiKey) {
        req.apiKeyValidated = false;
        return next();
      }

      // Nếu bắt buộc nhưng không có API key
      if (required && !apiKey) {
        return res.status(401).json({
          status: "error",
          message: "API key is required",
          error:
            "Missing API key in request headers (x-api-key) or query parameter (api_key)",
        });
      }

      // Xác thực API key từ database
      const validation = await ApiKey.validate(apiKey);

      if (!validation.valid) {
        return res.status(401).json({
          status: "error",
          message: "Invalid API key",
          error: validation.reason || "The provided API key is not valid",
        });
      }

      const keyData = validation.key;

      // Kiểm tra quyền truy cập nếu cần
      if (checkPermissions) {
        const hasPermission = checkEndpointPermission(req, keyData);
        if (!hasPermission) {
          return res.status(403).json({
            status: "error",
            message: "Insufficient permissions",
            error: `API key does not have permission to access ${req.path}`,
          });
        }
      }

      // API key hợp lệ, thêm thông tin vào request
      req.apiKeyValidated = true;
      req.apiKey = apiKey;
      req.apiKeyType = keyData.type;
      req.apiKeyData = keyData;
      req.websiteId = keyData.websiteId;

      next();
    } catch (error) {
      console.error("API key validation error:", error);
      res.status(500).json({
        status: "error",
        message: "API key validation error",
        error: error.message,
      });
    }
  };
};

/**
 * Kiểm tra quyền truy cập endpoint
 */
function checkEndpointPermission(req, keyData) {
  const path = req.path;
  const permissions = keyData.permissions || {};

  // Kiểm tra quyền tracking
  if (path.includes("/tracking") && !permissions.tracking) {
    return false;
  }

  // Kiểm tra quyền analytics
  if (path.includes("/analytics") && !permissions.analytics) {
    return false;
  }

  // Kiểm tra quyền user management
  if (path.includes("/users") && !permissions.users) {
    return false;
  }

  return true;
}

/**
 * Middleware chỉ cho phép API key hợp lệ (strict mode)
 */
export const requireApiKey = validateApiKey({ required: true });

/**
 * Middleware cho phép truy cập mà không cần API key (optional mode)
 */
export const optionalApiKey = validateApiKey({ required: false });

/**
 * Middleware yêu cầu quyền cụ thể
 */
export const requirePermission = (permission) => {
  return validateApiKey({
    required: true,
    checkPermissions: true,
  });
};

/**
 * Lấy danh sách API keys hợp lệ (chỉ cho development)
 */
export const getValidApiKeys = async () => {
  if (process.env.NODE_ENV === "development") {
    const dynamicKeys = ApiKey.getAll();
    const envKeys = [
      process.env.PRODUCTION_API_KEY,
      process.env.DEMO_API_KEY,
      process.env.TEST_API_KEY,
    ]
      .filter(Boolean)
      .map((key) => ({
        apiKey: ApiKey.maskApiKey(key),
        type: getApiKeyType(key),
        source: "environment",
      }));

    return {
      dynamic: dynamicKeys,
      environment: envKeys,
      total: dynamicKeys.length + envKeys.length,
    };
  }
  return { message: "API keys are hidden in production" };
};

/**
 * Xác định loại API key từ .env (legacy support)
 */
function getApiKeyType(apiKey) {
  if (apiKey === process.env.DEMO_API_KEY) return "demo";
  if (apiKey === process.env.TEST_API_KEY) return "test";
  if (apiKey === process.env.PRODUCTION_API_KEY) return "production";
  return "unknown";
}
