// models/ApiKey.js
// Model để quản lý API keys với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import process from "process";

const KEYSPACE = process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics";

export class ApiKey {
  constructor(data = {}) {
    this.api_key = data.api_key;
    this.website_id = data.website_id;
    this.customer_id = data.customer_id;
    this.name = data.name || "";
    this.permissions = data.permissions || new Set(["read"]); // SET<TEXT> in Cassandra
    this.rate_limit = data.rate_limit || 1000;
    this.status = data.status || "active"; // active, revoked, expired
    this.created_at = data.created_at || new Date();
    this.expires_at = data.expires_at || null;
    this.last_used = data.last_used || null;
    this.usage_count = data.usage_count || 0;

    // Convert permissions to Set if it's an array
    if (Array.isArray(this.permissions)) {
      this.permissions = new Set(this.permissions);
    } else if (!(this.permissions instanceof Set)) {
      this.permissions = new Set(["read"]);
    }
  }

  /**
   * Tạo API key mới
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO ${KEYSPACE}.api_keys (
          api_key, website_id, customer_id, name, permissions, rate_limit,
          status, created_at, expires_at, last_used, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        this.api_key,
        this.website_id,
        this.customer_id,
        this.name,
        this.permissions, // Set will be handled by Cassandra driver
        this.rate_limit,
        this.status,
        this.created_at,
        this.expires_at,
        this.last_used,
        this.usage_count,
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
      const query = `SELECT * FROM ${KEYSPACE}.websites WHERE api_key = ?`;
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
      const query = `SELECT * FROM ${KEYSPACE}.api_keys WHERE website_id = ? ALLOW FILTERING`;
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
   * Cập nhật API key
   */
  async update(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      if (updateData.name !== undefined) {
        this.name = updateData.name;
        fields.push("name = ?");
        values.push(this.name);
      }
      if (updateData.status !== undefined) {
        this.status = updateData.status;
        fields.push("status = ?");
        values.push(this.status);
      }
      if (updateData.permissions !== undefined) {
        this.permissions = new Set(updateData.permissions);
        fields.push("permissions = ?");
        values.push(this.permissions);
      }
      if (updateData.rate_limit !== undefined) {
        this.rate_limit = updateData.rate_limit;
        fields.push("rate_limit = ?");
        values.push(this.rate_limit);
      }
      if (updateData.expires_at !== undefined) {
        this.expires_at = updateData.expires_at;
        fields.push("expires_at = ?");
        values.push(this.expires_at);
      }

      values.push(this.api_key);

      const query = `UPDATE ${KEYSPACE}.api_keys SET ${fields.join(
        ", "
      )} WHERE api_key = ?`;
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
      const query = `DELETE FROM ${KEYSPACE}.api_keys WHERE api_key = ?`;
      await client.execute(query, [this.api_key], { prepare: true });
      return true;
    } catch (error) {
      console.error("Error deleting API key:", error);
      throw error;
    }
  }

  /**
   * Cập nhật lần sử dụng cuối (sử dụng COUNTER)
   */
  async updateLastUsed() {
    try {
      const client = cassandraConnection.getClient();
      const now = new Date();

      // Update last_used and increment usage_count counter
      const updateQueries = [
        {
          query: `UPDATE ${KEYSPACE}.api_keys SET last_used = ? WHERE api_key = ?`,
          params: [now, this.api_key],
        },
        {
          query: `UPDATE ${KEYSPACE}.api_keys SET usage_count = usage_count + 1 WHERE api_key = ?`,
          params: [this.api_key],
        },
      ];

      for (const q of updateQueries) {
        await client.execute(q.query, q.params, { prepare: true });
      }

      this.last_used = now;
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
      const query = `SELECT * FROM ${KEYSPACE}.api_keys LIMIT ?`;
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new ApiKey(row));
    } catch (error) {
      console.error("Error finding all API keys:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      api_key: this.api_key,
      website_id: this.website_id,
      customer_id: this.customer_id,
      name: this.name,
      permissions: Array.from(this.permissions),
      rate_limit: this.rate_limit,
      status: this.status,
      created_at: this.created_at,
      expires_at: this.expires_at,
      last_used: this.last_used,
      usage_count: this.usage_count,
    };
  }
}
