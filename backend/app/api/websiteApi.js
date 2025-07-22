// api/websiteApi.js
// Logic xử lý API cho websites

import { Website } from "../models/Website.js";

export class WebsiteAPI {
  /**
   * Lấy tất cả websites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa danh sách websites và thống kê
   */
  static async getAllWebsites(req, res) {
    try {
      const websites = await Website.findAll();

      res.json({
        status: "success",
        data: {
          websites: websites.map((w) => w.toJSON()),
          total: websites.length,
          stats: await Website.getStats(),
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Tạo website mới
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Tên website (required)
   * @param {string} req.body.url - URL của website (required)
   * @param {string} [req.body.type=production] - Loại website (optional)
   * @param {string} [req.body.description] - Mô tả website (optional)
   * @param {string} [req.body.owner=user] - Chủ sở hữu website (optional)
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa thông tin website mới và hướng dẫn tích hợp
   */
  static async createWebsite(req, res) {
    try {
      const {
        name,
        url,
        type = "production",
        description = "",
        owner = "user",
      } = req.body;

      // Validate required fields
      if (!name || !url) {
        return res.status(400).json({
          status: "error",
          message: "Name and URL are required",
          required_fields: ["name", "url"],
          optional_fields: ["type", "description", "owner"],
          example: {
            name: "My Portfolio Website",
            url: "https://myportfolio.com",
            type: "production",
            description: "Personal portfolio site",
            owner: "john_doe",
          },
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          status: "error",
          message: "Invalid URL format",
          example: "https://example.com",
        });
      }
      console.log('Tets');
      // Generate API key
      const apiKey = Website.generateApiKey(name, type);

      console.log(`Creating website: ${name} with API key: ${apiKey}`);
      // Create website
      const newWebsite = new Website({
        name,
        url,
        api_key: apiKey,
        type,
        description,
        owner,
      });

      await newWebsite.create();

      res.status(201).json({
        status: "success",
        message: `Website '${name}' created successfully`,
        data: {
          website: newWebsite.toJSON(),
          integration_guide: {
            javascript: `
// Add to your HTML <head>
<script src="tracking-script.js"></script>
<script>
  window.userTrackingConfig = {
    apiUrl: "http://localhost:3001/api/tracking",
    apiKey: "${apiKey}",
    enabled: true
  };
  
  const tracker = new UserTracker(window.userTrackingConfig);
</script>`,
            curl_example: `curl -X POST http://localhost:3001/api/tracking/event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "user_id": "user_123",
    "event_type": "click",
    "element_type": "button",
    "page_url": "${url}"
  }'`,
            analytics_example: `curl -H "x-api-key: ${apiKey}" \\
  http://localhost:3001/api/analytics/clicks`,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Lấy thông tin website theo ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - ID của website cần tìm
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa thông tin chi tiết của website
   */
  static async getWebsiteById(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);

      if (!website) {
        return res.status(404).json({
          status: "error",
          message: "Website not found",
        });
      }

      res.json({
        status: "success",
        data: website.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật website
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - ID của website cần cập nhật
   * @param {Object} req.body - Request body
   * @param {string} [req.body.name] - Tên website mới
   * @param {string} [req.body.url] - URL mới của website
   * @param {string} [req.body.description] - Mô tả mới
   * @param {string} [req.body.status] - Trạng thái mới
   * @param {string} [req.body.type] - Loại website mới
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa thông tin website đã cập nhật
   */
  static async updateWebsite(req, res) {
    try {
      const { id } = req.params;
      const { name, url, description, status, type } = req.body;

      const website = await Website.findById(id);
      if (!website) {
        return res.status(404).json({
          status: "error",
          message: "Website not found",
        });
      }

      const updatedWebsite = await website.update({
        name,
        url,
        description,
        status,
        type,
      });

      res.json({
        status: "success",
        message: "Website updated successfully",
        data: updatedWebsite.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Xóa website
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - ID của website cần xóa
   * @param {Object} res - Express response object
   * @returns {Object} JSON response xác nhận việc xóa website
   */
  static async deleteWebsite(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);

      if (!website) {
        return res.status(404).json({
          status: "error",
          message: "Website not found",
        });
      }

      await website.delete();

      res.json({
        status: "success",
        message: "Website deleted successfully",
        data: website.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Regenerate API key cho website
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - ID của website cần tạo lại API key
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa API key cũ và mới
   */
  static async regenerateApiKey(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);

      if (!website) {
        return res.status(404).json({
          status: "error",
          message: "Website not found",
        });
      }

      // Generate new API key
      const oldApiKey = website.api_key;
      const newApiKey = Website.generateApiKey(website.name, website.type);

      // Update website
      const updatedWebsite = await website.update({
        api_key: newApiKey,
      });

      res.json({
        status: "success",
        message: "API key regenerated successfully",
        data: {
          website: updatedWebsite.toJSON(),
          old_api_key: oldApiKey,
          new_api_key: newApiKey,
          warning:
            "⚠️  Update your website code with the new API key. Old key is now invalid!",
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Lấy thống kê websites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa các thống kê về websites
   */
  static async getWebsiteStats(req, res) {
    try {
      const stats = await Website.getStats();

      res.json({
        status: "success",
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}
