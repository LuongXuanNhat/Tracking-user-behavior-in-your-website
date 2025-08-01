// models/ApiKey.js
// Model để quản lý API keys với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class ApiKey {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.api_key = data.api_key;
    this.website_id = data.website_id;
    this.website_name = data.website_name;
    this.website_url = data.website_url;
    this.type = data.type || "production";
    this.description = data.description || "";
    this.owner = data.owner || "admin";
    this.status = data.status || "active";
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_used = data.last_used || null;
    this.usage_count = data.usage_count || 0;
    this.expires_at = data.expires_at || null;

    // Initialize permissions properly
    const defaultPermissions = {
      tracking: "true",
      analytics: "true",
      users: this.type !== "demo" ? "true" : "false",
      rate_limit: "1000",
    };

    if (data.permissions) {
      if (data.permissions instanceof Map) {
        this.permissions = Object.fromEntries(data.permissions);
      } else if (
        typeof data.permissions === "object" &&
        !Array.isArray(data.permissions)
      ) {
        this.permissions = { ...defaultPermissions, ...data.permissions };
      } else {
        this.permissions = defaultPermissions;
      }
    } else {
      this.permissions = defaultPermissions;
    }
  }

  /**
   * Tạo API key mới
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO user_logs.api_keys (
          id, api_key, website_id, website_name, website_url, type,
          description, owner, status, permissions, created_at, updated_at,
          last_used, usage_count, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert permissions object to Map for Cassandra
      const permissionsMap = new Map(Object.entries(this.permissions));

      const params = [
        this.id,
        this.api_key,
        this.website_id,
        this.website_name,
        this.website_url,
        this.type,
        this.description,
        this.owner,
        this.status,
        permissionsMap,
        this.created_at,
        this.updated_at,
        this.last_used,
        this.usage_count,
        this.expires_at,
      ];

      await client.execute(query, params, { prepare: true });
      return this;
    } catch (error) {
      console.error("Failed to save API key to Cassandra:", error);
      throw new Error(`Failed to save API key: ${error.message}`);
    }
  }

  /**
   * Tìm API key theo key string
   */
  static async findByApiKey(apiKey) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.api_keys WHERE api_key = ? ALLOW FILTERING";
      const result = await client.execute(query, [apiKey], { prepare: true });

      if (result.rows.length === 0) return null;
      return new ApiKey(result.rows[0]);
    } catch (error) {
      console.error("Error finding API key by key:", error);
      throw error;
    }
  }

  /**
   * Tìm API keys theo website ID
   */
  static async findByWebsiteId(websiteId) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.api_keys WHERE website_id = ? ALLOW FILTERING";
      const result = await client.execute(query, [websiteId], {
        prepare: true,
      });

      return result.rows.map((row) => new ApiKey(row));
    } catch (error) {
      console.error("Error finding API keys by website id:", error);
      throw error;
    }
  }

  /**
   * Tìm API key theo ID
   */
  static async findById(id) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.api_keys WHERE id = ?";
      const result = await client.execute(query, [id], { prepare: true });

      if (result.rows.length === 0) return null;
      return new ApiKey(result.rows[0]);
    } catch (error) {
      console.error("Error finding API key by id:", error);
      throw error;
    }
  }

  /**
   * Cập nhật API key
   */
  async update(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      if (updateData.description !== undefined) {
        this.description = updateData.description;
        fields.push("description = ?");
        values.push(this.description);
      }
      if (updateData.status !== undefined) {
        this.status = updateData.status;
        fields.push("status = ?");
        values.push(this.status);
      }
      if (updateData.permissions !== undefined) {
        this.permissions = { ...this.permissions, ...updateData.permissions };
        fields.push("permissions = ?");
        values.push(new Map(Object.entries(this.permissions)));
      }
      if (updateData.expires_at !== undefined) {
        this.expires_at = updateData.expires_at;
        fields.push("expires_at = ?");
        values.push(this.expires_at);
      }

      this.updated_at = new Date();
      fields.push("updated_at = ?");
      values.push(this.updated_at);
      values.push(this.id);

      const query = `UPDATE user_logs.api_keys SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await client.execute(query, values, { prepare: true });

      return this;
    } catch (error) {
      console.error("Error updating API key:", error);
      throw error;
    }
  }

  /**
   * Xóa API key
   */
  async delete() {
    try {
      const client = cassandraConnection.getClient();
      const query = "DELETE FROM user_logs.api_keys WHERE id = ?";
      await client.execute(query, [this.id], { prepare: true });
      return true;
    } catch (error) {
      console.error("Error deleting API key:", error);
      throw error;
    }
  }

  /**
   * Cập nhật lần sử dụng cuối
   */
  async updateLastUsed() {
    try {
      const client = cassandraConnection.getClient();
      const now = new Date();

      const query = `
        UPDATE user_logs.api_keys 
        SET last_used = ?, usage_count = usage_count + 1, updated_at = ?
        WHERE id = ?
      `;

      await client.execute(query, [now, now, this.id], { prepare: true });
      this.last_used = now;
      this.updated_at = now;
      this.usage_count += 1;

      return this;
    } catch (error) {
      console.error("Error updating last used:", error);
      throw error;
    }
  }

  /**
   * Tạo API key string mới
   */
  static generateApiKey(websiteName, type = "production") {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 12);
    const cleanName = websiteName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${type}_${cleanName}_${timestamp}_${randomString}`;
  }

  /**
   * Kiểm tra API key có hợp lệ và active không
   */
  static async validateApiKey(apiKey) {
    try {
      const apiKeyObj = await this.findByApiKey(apiKey);
      if (!apiKeyObj) return { valid: false, reason: "API key not found" };

      if (apiKeyObj.status !== "active") {
        return { valid: false, reason: "API key is not active" };
      }

      if (apiKeyObj.expires_at && new Date() > apiKeyObj.expires_at) {
        return { valid: false, reason: "API key has expired" };
      }

      // Update last used
      await apiKeyObj.updateLastUsed();

      return { valid: true, apiKey: apiKeyObj };
    } catch (error) {
      console.error("Error validating API key:", error);
      return { valid: false, reason: "Validation error" };
    }
  }

  /**
   * Lấy tất cả API keys
   */
  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.api_keys LIMIT ?";
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new ApiKey(row));
    } catch (error) {
      console.error("Error finding all API keys:", error);
      throw error;
    }
  }

  /**
   * Thống kê API keys
   */
  static async getStats() {
    try {
      const apiKeys = await this.findAll();
      const total = apiKeys.length;
      const active = apiKeys.filter((k) => k.status === "active").length;
      const expired = apiKeys.filter(
        (k) => k.expires_at && new Date() > k.expires_at
      ).length;
      const byType = apiKeys.reduce((acc, key) => {
        acc[key.type] = (acc[key.type] || 0) + 1;
        return acc;
      }, {});

      return { total, active, expired, byType };
    } catch (error) {
      console.error("Error getting API key stats:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      api_key: this.api_key,
      website_id: this.website_id,
      website_name: this.website_name,
      website_url: this.website_url,
      type: this.type,
      description: this.description,
      owner: this.owner,
      status: this.status,
      permissions: this.permissions,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_used: this.last_used,
      usage_count: this.usage_count,
      expires_at: this.expires_at,
    };
  }
}
