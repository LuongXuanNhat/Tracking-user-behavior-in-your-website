// api/apiKeyApi.js
// API để quản lý API Keys

import { ApiKey } from "../models/ApiKey.js";

/**
 * Tạo API key mới
 */
export const createApiKey = async (req, res) => {
  try {
    const {
      websiteName,
      websiteUrl,
      type = "production",
      description = "",
      permissions = {},
    } = req.body;

    // Validation
    if (!websiteName || !websiteUrl) {
      return res.status(400).json({
        status: "error",
        message: "Website name and URL are required",
        error: "Missing required fields: websiteName, websiteUrl",
      });
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Invalid website URL format",
        error: "Please provide a valid URL (e.g., https://example.com)",
      });
    }

    // Validate type
    const validTypes = ["demo", "test", "production"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid API key type",
        error: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Tạo API key
    const newKey = ApiKey.create({
      websiteId: Date.now(), // Tạm thời dùng timestamp
      websiteName,
      websiteUrl,
      type,
      description,
      owner: req.apiKeyData?.owner || "admin",
      permissions,
    });

    res.status(201).json({
      status: "success",
      message: "API key created successfully",
      data: {
        ...newKey,
        // Chỉ hiển thị API key một lần khi tạo
        apiKey: newKey.apiKey,
      },
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create API key",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách API keys
 */
export const getApiKeys = async (req, res) => {
  try {
    const { type, status, websiteId, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (websiteId) filters.websiteId = parseInt(websiteId);

    const apiKeys = ApiKey.getAll(filters);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedKeys = apiKeys.slice(startIndex, endIndex);

    res.json({
      status: "success",
      data: {
        apiKeys: paginatedKeys,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: apiKeys.length,
          totalPages: Math.ceil(apiKeys.length / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get API keys error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve API keys",
      error: error.message,
    });
  }
};

/**
 * Lấy thông tin chi tiết API key
 */
export const getApiKeyDetails = async (req, res) => {
  try {
    const { keyId } = req.params;

    // Tìm key theo ID (trong thực tế sẽ dùng database)
    const allKeys = Array.from(ApiKey.apiKeys?.values() || []);
    const keyData = allKeys.find((key) => key.id === parseInt(keyId));

    if (!keyData) {
      return res.status(404).json({
        status: "error",
        message: "API key not found",
        error: `No API key found with ID: ${keyId}`,
      });
    }

    res.json({
      status: "success",
      data: {
        ...keyData,
        apiKey: ApiKey.maskApiKey(keyData.apiKey),
      },
    });
  } catch (error) {
    console.error("Get API key details error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve API key details",
      error: error.message,
    });
  }
};

/**
 * Vô hiệu hóa API key
 */
export const disableApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { reason = "Manual disable by admin" } = req.body;

    // Tìm key theo ID
    const allKeys = Array.from(ApiKey.apiKeys?.values() || []);
    const keyData = allKeys.find((key) => key.id === parseInt(keyId));

    if (!keyData) {
      return res.status(404).json({
        status: "error",
        message: "API key not found",
        error: `No API key found with ID: ${keyId}`,
      });
    }

    const success = ApiKey.disable(keyData.apiKey, reason);

    if (success) {
      res.json({
        status: "success",
        message: "API key disabled successfully",
        data: {
          id: keyData.id,
          status: "disabled",
          reason,
        },
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Failed to disable API key",
      });
    }
  } catch (error) {
    console.error("Disable API key error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to disable API key",
      error: error.message,
    });
  }
};

/**
 * Gia hạn API key
 */
export const extendApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { extensionDays = 365 } = req.body;

    // Validation
    if (extensionDays <= 0 || extensionDays > 1095) {
      // Max 3 years
      return res.status(400).json({
        status: "error",
        message: "Invalid extension period",
        error: "Extension days must be between 1 and 1095 (3 years)",
      });
    }

    // Tìm key theo ID
    const allKeys = Array.from(ApiKey.apiKeys?.values() || []);
    const keyData = allKeys.find((key) => key.id === parseInt(keyId));

    if (!keyData) {
      return res.status(404).json({
        status: "error",
        message: "API key not found",
        error: `No API key found with ID: ${keyId}`,
      });
    }

    const updatedKey = ApiKey.extend(keyData.apiKey, extensionDays);

    if (updatedKey) {
      res.json({
        status: "success",
        message: "API key extended successfully",
        data: {
          id: updatedKey.id,
          expires_at: updatedKey.expires_at,
          extension_days: extensionDays,
        },
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Failed to extend API key",
      });
    }
  } catch (error) {
    console.error("Extend API key error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to extend API key",
      error: error.message,
    });
  }
};

/**
 * Lấy thống kê API keys
 */
export const getApiKeyStats = async (req, res) => {
  try {
    const allKeys = Array.from(ApiKey.apiKeys?.values() || []);

    const stats = {
      total: allKeys.length,
      active: allKeys.filter((key) => key.status === "active").length,
      disabled: allKeys.filter((key) => key.status === "disabled").length,
      expired: allKeys.filter(
        (key) => key.expires_at && new Date() > new Date(key.expires_at)
      ).length,
      byType: {
        demo: allKeys.filter((key) => key.type === "demo").length,
        test: allKeys.filter((key) => key.type === "test").length,
        production: allKeys.filter((key) => key.type === "production").length,
      },
      totalUsage: allKeys.reduce((sum, key) => sum + (key.usage_count || 0), 0),
      mostUsed: allKeys
        .filter((key) => key.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 5)
        .map((key) => ({
          id: key.id,
          websiteName: key.websiteName,
          usage_count: key.usage_count,
          last_used: key.last_used,
        })),
    };

    res.json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    console.error("Get API key stats error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve API key statistics",
      error: error.message,
    });
  }
};
