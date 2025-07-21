// middlewares/apikey.js
// Middleware kiểm tra API Key

// Danh sách API keys từ .env
const VALID_API_KEYS = [
  process.env.PRODUCTION_API_KEY,
  process.env.DEMO_API_KEY,
  process.env.TEST_API_KEY,
].filter(Boolean);

/**
 * Middleware kiểm tra API Key
 */
export const validateApiKey = (options = {}) => {
  const {
    required = true, // Bắt buộc API key hay không
    allowPublicEndpoints = [], // Danh sách endpoints không cần API key
  } = options;

  return (req, res, next) => {
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

      // Kiểm tra API key có hợp lệ không
      if (!VALID_API_KEYS.includes(apiKey)) {
        return res.status(401).json({
          status: "error",
          message: "Invalid API key",
          error: "The provided API key is not valid",
        });
      }

      // API key hợp lệ, thêm thông tin vào request
      req.apiKeyValidated = true;
      req.apiKey = apiKey;
      req.apiKeyType = getApiKeyType(apiKey);

      next();
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "API key validation error",
        error: error.message,
      });
    }
  };
};

/**
 * Middleware chỉ cho phép API key hợp lệ (strict mode)
 */
export const requireApiKey = validateApiKey({ required: true });

/**
 * Middleware cho phép truy cập mà không cần API key (optional mode)
 */
export const optionalApiKey = validateApiKey({ required: false });

/**
 * Xác định loại API key
 */
function getApiKeyType(apiKey) {
  if (apiKey === process.env.DEMO_API_KEY) return "demo";
  if (apiKey === process.env.TEST_API_KEY) return "test";
  if (apiKey === process.env.PRODUCTION_API_KEY) return "production";
  return "unknown";
}

/**
 * Lấy danh sách API keys hợp lệ (chỉ cho development)
 */
export const getValidApiKeys = () => {
  if (process.env.NODE_ENV === "development") {
    return VALID_API_KEYS;
  }
  return ["***hidden***"];
};
