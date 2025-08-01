// models/Website.js
// Model để quản lý websites với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import cassandra from "cassandra-driver";

export class Website {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.url = data.url;
    this.customer_id = data.customer_id;
    this.type = data.type || "production";
    this.description = data.description || "";
    this.status = data.status || "active";
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_activity = data.last_activity || null;
    this.monthly_events = data.monthly_events || 0;
    this.tracking_settings = data.tracking_settings || {};

    // Initialize settings properly
    const defaultSettings = {
      auto_tracking: "true",
      anonymize_ips: "false",
      cookie_consent: "false",
      session_timeout: "30",
    };

    if (data.tracking_settings) {
      if (data.tracking_settings instanceof Map) {
        this.tracking_settings = Object.fromEntries(data.tracking_settings);
      } else if (
        typeof data.tracking_settings === "object" &&
        !Array.isArray(data.tracking_settings)
      ) {
        this.tracking_settings = {
          ...defaultSettings,
          ...data.tracking_settings,
        };
      } else {
        this.tracking_settings = defaultSettings;
      }
    } else {
      this.tracking_settings = defaultSettings;
    }
  }

  /**
   * Tạo website mới
   */
  async create() {
    try {
      console.log("Creating website with data:", {
        id: this.id,
        name: this.name,
        url: this.url,
        customer_id: this.customer_id,
        tracking_settings: this.tracking_settings,
      });

      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO user_logs.websites (
          id, name, url, customer_id, type, description, status,
          created_at, updated_at, tracking_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert settings object to Map for Cassandra
      const settingsToSave = this.tracking_settings || {};
      let settingsMap;
      if (
        settingsToSave &&
        typeof settingsToSave === "object" &&
        !Array.isArray(settingsToSave)
      ) {
        settingsMap = new Map(Object.entries(settingsToSave));
      } else {
        settingsMap = new Map([
          ["auto_tracking", "true"],
          ["anonymize_ips", "false"],
          ["cookie_consent", "false"],
          ["session_timeout", "30"],
        ]);
      }

      const params = [
        this.id,
        this.name,
        this.url,
        this.customer_id,
        this.type,
        this.description,
        this.status,
        this.created_at,
        this.updated_at,
        settingsMap,
      ];

      await client.execute(query, params, { prepare: true });
      console.log("Website created successfully!");
      return this;
    } catch (error) {
      console.error("Failed to save website to Cassandra:", error);
      throw new Error(`Failed to save website: ${error.message}`);
    }
  }
  /**
   * Tìm website theo customer ID
   */
  static async findByCustomerId(customerId) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.websites WHERE customer_id = ? ALLOW FILTERING";
      const result = await client.execute(query, [customerId], {
        prepare: true,
      });

      return result.rows.map((row) => new Website(row));
    } catch (error) {
      console.error("Error finding websites by customer id:", error);
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
      if (updateData.tracking_settings !== undefined) {
        this.tracking_settings = {
          ...this.tracking_settings,
          ...updateData.tracking_settings,
        };
        fields.push("tracking_settings = ?");
        values.push(new Map(Object.entries(this.tracking_settings)));
      }
      if (updateData.last_activity !== undefined) {
        this.last_activity = updateData.last_activity;
        fields.push("last_activity = ?");
        values.push(this.last_activity);
      }
      if (updateData.monthly_events !== undefined) {
        this.monthly_events = updateData.monthly_events;
        fields.push("monthly_events = ?");
        values.push(this.monthly_events);
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
   * Cập nhật hoạt động cuối
   */
  async updateLastActivity() {
    try {
      const client = cassandraConnection.getClient();
      const now = new Date();

      const query = `
        UPDATE user_logs.websites 
        SET last_activity = ?, monthly_events = monthly_events + 1, updated_at = ?
        WHERE id = ?
      `;

      await client.execute(query, [now, now, this.id], { prepare: true });
      this.last_activity = now;
      this.updated_at = now;
      this.monthly_events += 1;

      return this;
    } catch (error) {
      console.error("Error updating last activity:", error);
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
      customer_id: this.customer_id,
      type: this.type,
      description: this.description,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_activity: this.last_activity,
      monthly_events: this.monthly_events,
      tracking_settings: this.tracking_settings,
    };
  }
}
