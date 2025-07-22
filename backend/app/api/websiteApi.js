// api/websiteApi.js
// Logic xử lý API cho websites

import { Website } from "../models/Website.js";

export class WebsiteAPI {
  /**
   * Lấy tất cả websites
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

      // Generate API key
      const apiKey = Website.generateApiKey(name, type);

      // Create website
      const newWebsite = await Website.create({
        name,
        url,
        api_key: apiKey,
        type,
        description,
        owner,
      });

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
