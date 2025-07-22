// models/Website.js
// Model để quản lý websites với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import cassandra from "cassandra-driver";

export class Website {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.url = data.url;
    this.api_key = data.api_key;
    this.type = data.type || "production";
    this.description = data.description || "";
    this.owner = data.owner || "admin";
    this.status = data.status || "active";
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_used = data.last_used || null;
    this.usage_count = data.usage_count || 0;

    // Initialize permissions properly - ensure it's always an object
    const defaultPermissions = {
      tracking: "true",
      analytics: "true",
      users: this.type !== "demo" ? "true" : "false",
    };

    if (data.permissions) {
      // If permissions is a Map (from Cassandra), convert to object
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

    console.log("Constructor permissions:", this.permissions);
  }

  /**
   * Tạo website mới với API key
   */
  async create() {
    try {
      console.log("Creating website with data:", {
        id: this.id,
        name: this.name,
        url: this.url,
        api_key: this.api_key,
        permissions: this.permissions,
      });

      const client = cassandraConnection.getClient();
      const query =
        "INSERT INTO user_logs.websites (id, name, url, api_key, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";

      // Convert permissions object to Map for Cassandra, ensure it's not undefined
      const permissionsToSave = this.permissions || {
        tracking: "true",
        analytics: "true",
        users: "true",
      };

      // Ensure permissionsToSave is an object before calling Object.entries
      let permissionsMap;
      if (
        permissionsToSave &&
        typeof permissionsToSave === "object" &&
        !Array.isArray(permissionsToSave)
      ) {
        permissionsMap = new Map(Object.entries(permissionsToSave));
      } else {
        // Fallback to default permissions
        permissionsMap = new Map([
          ["tracking", "true"],
          ["analytics", "true"],
          ["users", "true"],
        ]);
      }
      console.log("Permissions as Map:", permissionsMap);

      const params = [
        this.id,
        this.name,
        this.url,
        this.api_key,
        permissionsMap,
        this.created_at,
        this.updated_at,
      ];

      await client.execute(query, params, {
        prepare: true,
      });

      console.log("Website created successfully!");
      return this;
    } catch (error) {
      console.error("Failed to save website to Cassandra:", error);
      throw new Error(`Failed to save website: ${error.message}`);
    }
  }
  /**
   * Tìm website theo API key
   */
  static async findByApiKey(apiKey) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.websites WHERE api_key = ? ALLOW FILTERING";
      const result = await client.execute(query, [apiKey], { prepare: true });

      if (result.rows.length === 0) return null;
      return new Website(result.rows[0]);
    } catch (error) {
      console.error("Error finding website by api key:", error);
      throw error;
    }
  }

  /**
   * Lấy tất cả websites
   */
  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.websites LIMIT ?";
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new Website(row));
    } catch (error) {
      console.error("Error finding all websites:", error);
      throw error;
    }
  }

  /**
   * Tìm website theo ID
   */
  static async findById(id) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.websites WHERE id = ?";
      const result = await client.execute(query, [id], { prepare: true });

      if (result.rows.length === 0) return null;
      return new Website(result.rows[0]);
    } catch (error) {
      console.error("Error finding website by id:", error);
      throw error;
    }
  }

  /**
   * Cập nhật website
   */
  async update(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      // Dynamically build update query
      if (updateData.name !== undefined) {
        this.name = updateData.name;
        fields.push("name = ?");
        values.push(this.name);
      }
      if (updateData.url !== undefined) {
        this.url = updateData.url;
        fields.push("url = ?");
        values.push(this.url);
      }
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
      if (updateData.type !== undefined) {
        this.type = updateData.type;
        fields.push("type = ?");
        values.push(this.type);
      }

      this.updated_at = new Date();
      fields.push("updated_at = ?");
      values.push(this.updated_at);
      values.push(this.id);

      const query = `UPDATE user_logs.websites SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await client.execute(query, values, { prepare: true });

      return this;
    } catch (error) {
      console.error("Error updating website:", error);
      throw error;
    }
  }

  /**
   * Xóa website
   */
  async delete() {
    try {
      const client = cassandraConnection.getClient();
      const query = "DELETE FROM user_logs.websites WHERE id = ?";
      await client.execute(query, [this.id], { prepare: true });
      return true;
    } catch (error) {
      console.error("Error deleting website:", error);
      throw error;
    }
  }

  /**
   * Cập nhật lần sử dụng cuối
   */
  static async updateLastUsed(apiKey) {
    try {
      const client = cassandraConnection.getClient();
      const now = new Date();

      const query = `
        UPDATE user_logs.websites 
        SET last_used = ?, usage_count = usage_count + 1, updated_at = ?
        WHERE api_key = ?
      `;

      await client.execute(query, [now, now, apiKey], { prepare: true });
      return await this.findByApiKey(apiKey);
    } catch (error) {
      console.error("Error updating last used:", error);
      throw error;
    }
  }

  /**
   * Tạo API key mới
   */
  static generateApiKey(name, type = "production") {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 12);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${type}_${cleanName}_${timestamp}_${randomString}`;
  }

  /**
   * Kiểm tra API key có hợp lệ và active không
   */
  static async validateApiKey(apiKey) {
    try {
      const website = await this.findByApiKey(apiKey);
      return website && website.status === "active";
    } catch (error) {
      console.error("Error validating api key:", error);
      return false;
    }
  }

  /**
   * Thống kê websites
   */
  static async getStats() {
    try {
      const websites = await this.findAll();
      const total = websites.length;
      const active = websites.filter((w) => w.status === "active").length;
      const byType = websites.reduce((acc, website) => {
        acc[website.type] = (acc[website.type] || 0) + 1;
        return acc;
      }, {});

      return { total, active, byType };
    } catch (error) {
      console.error("Error getting stats:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      api_key: this.api_key,
      type: this.type,
      description: this.description,
      owner: this.owner,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_used: this.last_used,
      usage_count: this.usage_count,
      permissions: this.permissions,
    };
  }
}
