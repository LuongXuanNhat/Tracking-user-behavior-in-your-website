// api/apiKeyApi.js
// API endpoints cho quản lý API keys

import { ApiKey } from "../models/ApiKey.js";
import { Website } from "../models/Website.js";

/**
 * NGHIỆP VỤ 7: QUẢN LÝ CẤU HÌNH - API KEYS
 */

/**
 * Tạo API key mới cho website
 * POST /api/api-keys
 */
export async function createApiKey(req, res) {
  try {
    const customerId = req.customer.customerId;
    const {
      website_id,
      type = "production",
      description = "",
      permissions = {},
      expires_at = null,
    } = req.body;

    if (!website_id) {
      return res.status(400).json({
        success: false,
        message: "website_id là bắt buộc",
      });
    }

    // Kiểm tra quyền truy cập website
    const website = await Website.findById(website_id);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Tạo API key string
    const apiKeyString = ApiKey.generateApiKey(website.name, type);

    // Tạo API key record
    const apiKey = new ApiKey({
      api_key: apiKeyString,
      website_id: website.id,
      website_name: website.name,
      website_url: website.url,
      type,
      description,
      owner: req.customer.email,
      permissions,
      expires_at: expires_at ? new Date(expires_at) : null,
    });

    await apiKey.create();

    res.status(201).json({
      success: true,
      message: "Tạo API key thành công",
      data: apiKey.toJSON(),
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy danh sách API keys của customer
 * GET /api/api-keys
 */
export async function getApiKeys(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { website_id } = req.query;

    let apiKeys;

    if (website_id) {
      // Kiểm tra quyền truy cập website
      const website = await Website.findById(website_id);
      if (!website || website.customer_id !== customerId) {
        return res.status(403).json({
          success: false,
          message: "Không có quyền truy cập website này",
        });
      }

      apiKeys = await ApiKey.findByWebsiteId(website_id);
    } else {
      // Lấy tất cả API keys của customer
      const websites = await Website.findByCustomerId(customerId);
      const websiteIds = websites.map((w) => w.id);

      const allApiKeys = await Promise.all(
        websiteIds.map((id) => ApiKey.findByWebsiteId(id))
      );

      apiKeys = allApiKeys.flat();
    }

    res.json({
      success: true,
      data: apiKeys.map((key) => key.toJSON()),
    });
  } catch (error) {
    console.error("Get API keys error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy thông tin một API key cụ thể
 * GET /api/api-keys/:id
 */
export async function getApiKey(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy API key",
      });
    }

    // Kiểm tra quyền truy cập thông qua website
    const website = await Website.findById(apiKey.website_id);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập API key này",
      });
    }

    res.json({
      success: true,
      data: apiKey.toJSON(),
    });
  } catch (error) {
    console.error("Get API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Cập nhật API key
 * PUT /api/api-keys/:id
 */
export async function updateApiKey(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;
    const { description, status, permissions, expires_at } = req.body;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy API key",
      });
    }

    // Kiểm tra quyền truy cập thông qua website
    const website = await Website.findById(apiKey.website_id);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập API key này",
      });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (expires_at !== undefined)
      updateData.expires_at = expires_at ? new Date(expires_at) : null;

    await apiKey.update(updateData);

    res.json({
      success: true,
      message: "Cập nhật API key thành công",
      data: apiKey.toJSON(),
    });
  } catch (error) {
    console.error("Update API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Xóa API key
 * DELETE /api/api-keys/:id
 */
export async function deleteApiKey(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy API key",
      });
    }

    // Kiểm tra quyền truy cập thông qua website
    const website = await Website.findById(apiKey.website_id);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập API key này",
      });
    }

    // Kiểm tra xem có phải API key cuối cùng của website không
    const websiteApiKeys = await ApiKey.findByWebsiteId(apiKey.website_id);
    const activeKeys = websiteApiKeys.filter((key) => key.status === "active");

    if (activeKeys.length === 1 && activeKeys[0].id === apiKey.id) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa API key cuối cùng của website",
      });
    }

    await apiKey.delete();

    res.json({
      success: true,
      message: "Xóa API key thành công",
    });
  } catch (error) {
    console.error("Delete API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Xác thực API key (public endpoint)
 * POST /api/api-keys/validate
 */
export async function validateApiKey(req, res) {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({
        success: false,
        message: "api_key là bắt buộc",
      });
    }

    const validation = await ApiKey.validateApiKey(api_key);

    if (validation.valid) {
      const apiKey = validation.apiKey;
      const website = await Website.findById(apiKey.website_id);

      res.json({
        success: true,
        message: "API key hợp lệ",
        data: {
          api_key: apiKey.toJSON(),
          website: website ? website.toJSON() : null,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: validation.reason,
      });
    }
  } catch (error) {
    console.error("Validate API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Regenerate API key (tạo key mới thay thế key cũ)
 * POST /api/api-keys/:id/regenerate
 */
export async function regenerateApiKey(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const oldApiKey = await ApiKey.findById(id);
    if (!oldApiKey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy API key",
      });
    }

    // Kiểm tra quyền truy cập thông qua website
    const website = await Website.findById(oldApiKey.website_id);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập API key này",
      });
    }

    // Tạo API key string mới
    const newApiKeyString = ApiKey.generateApiKey(website.name, oldApiKey.type);

    // Tạo API key record mới
    const newApiKey = new ApiKey({
      api_key: newApiKeyString,
      website_id: oldApiKey.website_id,
      website_name: oldApiKey.website_name,
      website_url: oldApiKey.website_url,
      type: oldApiKey.type,
      description: oldApiKey.description + " (regenerated)",
      owner: oldApiKey.owner,
      permissions: oldApiKey.permissions,
      expires_at: oldApiKey.expires_at,
    });

    await newApiKey.create();

    // Deactivate API key cũ
    await oldApiKey.update({
      status: "inactive",
      description: oldApiKey.description + " (replaced)",
    });

    res.json({
      success: true,
      message: "Regenerate API key thành công",
      data: {
        new_api_key: newApiKey.toJSON(),
        old_api_key: oldApiKey.toJSON(),
      },
    });
  } catch (error) {
    console.error("Regenerate API key error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Thống kê API keys
 * GET /api/api-keys/stats
 */
export async function getApiKeyStats(req, res) {
  try {
    const stats = await ApiKey.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get API key stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
