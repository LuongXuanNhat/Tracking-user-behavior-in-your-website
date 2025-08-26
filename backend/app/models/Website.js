// models/Website.js
// Model để quản lý websites với Cassandra integration

import cassandraConnection, { types } from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import process from "process";
import NodeCache from "node-cache";

const KEYSPACE = process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics";

// Cache cho website với TTL = 5 phút và check period mỗi 2 phút
const websiteCache = new NodeCache({
  stdTTL: 300, // 5 phút
  checkperiod: 120, // Check expired keys mỗi 2 phút
  useClones: false, // Tránh deep clone, tăng performance
});

// Cache cho invalid website IDs (ngăn spam query)
const invalidWebsiteCache = new NodeCache({
  stdTTL: 60, // Cache invalid ID trong 1 phút
  checkperiod: 30,
});

export class Website {
  constructor(data = {}) {
    this.website_id = data.website_id || uuidv4();
    this.customer_id = data.customer_id;
    this.name = data.name;
    this.domain = data.domain;
    this.url = data.url;
    this.status = data.status || "active"; // active, inactive, suspended
    this.settings = data.settings || {};
    this.api_key = data.api_key || new Set(); // SET<TEXT> in Cassandra
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_activity = data.last_activity || null;

    // Initialize settings properly
    const defaultSettings = {
      auto_tracking: "true",
      anonymize_ips: "false",
      cookie_consent: "false",
      session_timeout: "30",
    };

    if (data.settings) {
      if (data.settings instanceof Map) {
        this.settings = Object.fromEntries(data.settings);
      } else if (
        typeof data.settings === "object" &&
        !Array.isArray(data.settings)
      ) {
        this.settings = {
          ...defaultSettings,
          ...data.settings,
        };
      } else {
        this.settings = defaultSettings;
      }
    } else {
      this.settings = defaultSettings;
    }
  }

  /**
   * Tạo website mới
   */
  async create() {
    try {
      console.log("Creating website with data:", {
        website_id: this.website_id,
        name: this.name,
        domain: this.domain,
        url: this.url,
        customer_id: this.customer_id,
        settings: this.settings,
      });
      const client = await cassandraConnection.ensureConnection();

      // Insert into main websites table
      const query = `
        INSERT INTO ${KEYSPACE}.websites (
          website_id, customer_id, name, domain, url, status,
          settings, api_key, created_at, updated_at, last_activity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert settings object to Map for Cassandra
      const settingsToSave = this.settings || {};
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
        this.website_id,
        this.customer_id,
        this.name,
        this.domain,
        this.url,
        this.status,
        settingsMap,
        this.api_key,
        this.created_at,
        this.updated_at,
        this.last_activity,
      ];

      await client.execute(query, params, { prepare: true });
      console.log("Website created successfully!");

      // Tự động thêm dữ liệu vào bảng api_key_websites (1 website = 1 record)
      await this._insertApiKeyWebsites(client);

      // Thêm vào cache sau khi tạo thành công
      if (this.status === "active") {
        const websiteIdStr = this.website_id?.toString() || this.website_id;
        websiteCache.set(websiteIdStr, this);
      }

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
      const query = `SELECT * FROM ${KEYSPACE}.websites WHERE customer_id = ? ALLOW FILTERING`;
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
   * Tìm website theo ID với cache optimization
   */
  static async findById(website_id) {
    try {
      if (!website_id) {
        return null;
      }

      // Đảm bảo website_id là string
      const websiteIdStr = website_id?.toString() || website_id;

      // 1. Check invalid cache trước (tránh spam query)
      if (invalidWebsiteCache.get(websiteIdStr)) {
        return null;
      }

      // 2. Check valid cache
      let website = websiteCache.get(websiteIdStr);
      if (website) {
        // Kiểm tra lại status từ cache (có thể đã bị suspend)
        if (website.status !== "active") {
          // Remove khỏi cache nếu không active
          websiteCache.del(websiteIdStr);
          return null;
        }
        return website;
      }

      // 3. Query database (chỉ khi cache miss)
      console.log(`Cache miss for website ID: ${websiteIdStr}`);

      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.websites WHERE website_id = ?`;
      const result = await client.execute(query, [website_id], {
        prepare: true,
        readTimeout: 10000, // 10 second timeout thay vì default 12s
        consistency: types.consistencies.localOne, // Faster consistency
      });

      if (result.rows.length === 0) {
        // Cache invalid website ID để tránh spam
        invalidWebsiteCache.set(websiteIdStr, true);
        return null;
      }

      website = new Website(result.rows[0]);

      // 4. Cache valid website (chỉ khi status active)
      if (website.status === "active") {
        websiteCache.set(websiteIdStr, website);
      }

      return website;
    } catch (error) {
      console.error("Error finding website by id:", error);

      // Log chi tiết để debug
      if (error.name === "OperationTimedOutError") {
        console.error(
          "Database timeout for website ID query - consider connection pooling optimization"
        );
      }

      throw error;
    }
  }

  /**
   * Kiểm tra website có tồn tại theo API key
   */
  static async existsByApiKey(apiKey) {
    try {
      const client = await cassandraConnection.ensureConnection();
      const query = `SELECT website_id FROM ${KEYSPACE}.websites WHERE api_key = ? ALLOW FILTERING`;
      const result = await client.execute(query, [apiKey], {
        prepare: true,
        readTimeout: 10000, // 10 second timeout thay vì default 12s
        consistency: types.consistencies.localOne, // Faster consistency
      });

      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking website existence by api key:", error);
      throw error;
    }
  }

  /**
   * Tìm website theo API key - OPTIMIZED VERSION
   */
  static async findByApiKey(apiKey) {
    try {
      const client = await cassandraConnection.ensureConnection();

      // Sử dụng table tối ưu thay vì ALLOW FILTERING
      const query = `SELECT * FROM ${KEYSPACE}.api_key_websites WHERE api_key = ?`;
      const result = await client.execute(query, [apiKey], {
        prepare: true,
        readTimeout: 8000, // Tăng timeout để tương thích với failover
        consistency: types.consistencies.localQuorum, // Consistency mạnh hơn cho HA
        retry: {
          times: 3, // Retry 3 lần khi có lỗi
        },
      });

      if (result.rows.length === 0) return null;

      const website = new Website(result.rows[0]);

      // Cache website nếu status active
      if (website.status === "active") {
        // Đảm bảo website_id là string trước khi cache
        const websiteIdStr =
          website.website_id?.toString() || website.website_id;
        websiteCache.set(websiteIdStr, website);
      }

      return website;
    } catch (error) {
      console.error("Error finding website by api key:", error);

      // Specific error handling for connection issues
      if (
        error.code === "ECONNREFUSED" ||
        error.name === "NoHostAvailableError"
      ) {
        console.error("❌ Database connection failed - attempting recovery...");
        // Log the error but don't expose sensitive information
        throw new Error("Database temporarily unavailable. Please try again.");
      }

      // For other errors, log and rethrow
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
      if (updateData.domain !== undefined) {
        this.domain = updateData.domain;
        fields.push("domain = ?");
        values.push(this.domain);
      }
      if (updateData.url !== undefined) {
        this.url = updateData.url;
        fields.push("url = ?");
        values.push(this.url);
      }
      if (updateData.status !== undefined) {
        this.status = updateData.status;
        fields.push("status = ?");
        values.push(this.status);
      }
      if (updateData.settings !== undefined) {
        this.settings = {
          ...this.settings,
          ...updateData.settings,
        };
        fields.push("settings = ?");
        values.push(new Map(Object.entries(this.settings)));
      }
      if (updateData.api_key !== undefined) {
        this.api_key = new Set(updateData.api_key);
        fields.push("api_key = ?");
        values.push(this.api_key);
      }
      if (updateData.last_activity !== undefined) {
        this.last_activity = updateData.last_activity;
        fields.push("last_activity = ?");
        values.push(this.last_activity);
      }

      this.updated_at = new Date();
      fields.push("updated_at = ?");
      values.push(this.updated_at);
      values.push(this.website_id);

      const query = `UPDATE ${KEYSPACE}.websites SET ${fields.join(
        ", "
      )} WHERE website_id = ?`;
      await client.execute(query, values, { prepare: true });

      // Cập nhật cache sau khi update thành công
      const websiteIdStr = this.website_id?.toString() || this.website_id;
      websiteCache.set(websiteIdStr, this);
      invalidWebsiteCache.del(websiteIdStr);

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

      // Trước khi xóa, xóa record khỏi bảng api_key_websites
      await this._deleteApiKeyWebsites(client);

      // Xóa website chính
      const query = `DELETE FROM ${KEYSPACE}.websites WHERE website_id = ?`;
      await client.execute(query, [this.website_id], { prepare: true });

      // Xóa khỏi cache sau khi delete thành công
      const websiteIdStr = this.website_id?.toString() || this.website_id;
      websiteCache.del(websiteIdStr);
      invalidWebsiteCache.del(websiteIdStr);

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
        UPDATE ${KEYSPACE}.websites 
        SET last_activity = ?, monthly_events = monthly_events + 1, updated_at = ?
        WHERE id = ?
      `;

      await client.execute(query, [now, now, this.website_id], {
        prepare: true,
      });
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
      const query = `SELECT * FROM ${KEYSPACE}.websites LIMIT ?`;
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

  /**
   * Utility functions để quản lý cache
   */
  static get cacheUtils() {
    return {
      // Clear cache cho một website ID cụ thể
      clearCache: (websiteId) => {
        const websiteIdStr = websiteId?.toString() || websiteId;
        websiteCache.del(websiteIdStr);
        invalidWebsiteCache.del(websiteIdStr);
      },

      // Clear toàn bộ cache
      clearAllCache: () => {
        websiteCache.flushAll();
        invalidWebsiteCache.flushAll();
      },

      // Lấy thống kê cache
      getCacheStats: () => ({
        validCache: {
          keys: websiteCache.keys().length,
          stats: websiteCache.getStats(),
        },
        invalidCache: {
          keys: invalidWebsiteCache.keys().length,
          stats: invalidWebsiteCache.getStats(),
        },
      }),

      // Pre-warm cache (có thể dùng khi startup)
      preWarmCache: async (websiteIds = []) => {
        console.log(
          `Pre-warming cache for ${websiteIds.length} website IDs...`
        );
        const promises = websiteIds.map(async (websiteId) => {
          try {
            const websiteIdStr = websiteId?.toString() || websiteId;
            const client = cassandraConnection.getClient();
            const query = `SELECT * FROM ${KEYSPACE}.websites WHERE website_id = ?`;
            const result = await client.execute(query, [websiteId], {
              prepare: true,
              readTimeout: 10000,
              consistency: types.consistencies.localOne,
            });

            if (result.rows.length > 0) {
              const website = new Website(result.rows[0]);
              if (website.status === "active") {
                websiteCache.set(websiteIdStr, website);
              }
            }
          } catch (error) {
            console.error(
              `Failed to pre-warm cache for website ID: ${websiteId}`,
              error
            );
          }
        });

        await Promise.allSettled(promises);
        console.log("Website cache pre-warming completed");
      },

      // Refresh cache cho một website cụ thể
      refreshCache: async (websiteId) => {
        try {
          const websiteIdStr = websiteId?.toString() || websiteId;
          websiteCache.del(websiteIdStr);
          invalidWebsiteCache.del(websiteIdStr);

          const website = await Website.findById(websiteId);
          return website;
        } catch (error) {
          console.error(
            `Failed to refresh cache for website ID: ${websiteId}`,
            error
          );
          throw error;
        }
      },
    };
  }

  /**
   * Helper method: Thêm dữ liệu vào bảng api_key_websites
   * Mỗi website chỉ có 1 record duy nhất với api_key là string
   * @private
   */
  async _insertApiKeyWebsites(client) {
    try {
      // Convert api_key Set thành string để lưu vào api_key_websites
      let apiKeyString = "";

      if (this.api_key instanceof Set) {
        // Nếu là Set, lấy phần tử đầu tiên hoặc join thành string
        const apiKeyArray = Array.from(this.api_key);
        apiKeyString = apiKeyArray.length > 0 ? apiKeyArray[0] : "";
      } else if (Array.isArray(this.api_key)) {
        // Nếu là Array, lấy phần tử đầu tiên
        apiKeyString = this.api_key.length > 0 ? this.api_key[0] : "";
      } else if (typeof this.api_key === "string") {
        // Nếu đã là string
        apiKeyString = this.api_key.trim();
      } else {
        console.log("No valid API key to insert into api_key_websites table");
        return;
      }

      // Kiểm tra nếu không có API key thì không insert
      if (!apiKeyString) {
        console.log("No API key to insert into api_key_websites table");
        return;
      }

      console.log(`Inserting website with API key: "${apiKeyString}"`);

      const apiKeyWebsiteQuery = `
        INSERT INTO ${KEYSPACE}.api_key_websites (
          api_key, website_id, customer_id, name, domain, url, status,
          settings, created_at, updated_at, last_activity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert settings object to Map for Cassandra
      const settingsMap =
        this.settings &&
        typeof this.settings === "object" &&
        !Array.isArray(this.settings)
          ? new Map(Object.entries(this.settings))
          : new Map([
              ["auto_tracking", "true"],
              ["anonymize_ips", "false"],
              ["cookie_consent", "false"],
              ["session_timeout", "30"],
            ]);

      const apiKeyParams = [
        apiKeyString, // api_key (TEXT PRIMARY KEY) - chỉ 1 string
        this.website_id, // website_id (UUID)
        this.customer_id, // customer_id (UUID)
        this.name, // name (TEXT)
        this.domain, // domain (TEXT)
        this.url, // url (TEXT)
        this.status, // status (TEXT)
        settingsMap, // settings (MAP<TEXT, TEXT>)
        this.created_at, // created_at (TIMESTAMP)
        this.updated_at, // updated_at (TIMESTAMP)
        this.last_activity, // last_activity (TIMESTAMP)
      ];

      // Insert 1 record duy nhất cho website này
      await client.execute(apiKeyWebsiteQuery, apiKeyParams, { prepare: true });

      console.log(
        `Successfully inserted 1 record for website ${this.website_id} with API key: ${apiKeyString}`
      );
    } catch (error) {
      console.error("Error inserting into api_key_websites:", error);
      throw error;
    }
  }

  /**
   * Helper method: Xóa dữ liệu khỏi bảng api_key_websites
   * Xóa record duy nhất của website này
   * @private
   */
  async _deleteApiKeyWebsites(client) {
    try {
      // Convert api_key Set thành string
      let apiKeyString = "";

      if (this.api_key instanceof Set) {
        const apiKeyArray = Array.from(this.api_key);
        apiKeyString = apiKeyArray.length > 0 ? apiKeyArray[0] : "";
      } else if (Array.isArray(this.api_key)) {
        apiKeyString = this.api_key.length > 0 ? this.api_key[0] : "";
      } else if (typeof this.api_key === "string") {
        apiKeyString = this.api_key.trim();
      } else {
        console.log("No valid API key to delete from api_key_websites table");
        return;
      }

      if (!apiKeyString) {
        console.log("No API key to delete from api_key_websites table");
        return;
      }

      const deleteApiKeyQuery = `DELETE FROM ${KEYSPACE}.api_key_websites WHERE api_key = ?`;

      // Xóa 1 record duy nhất
      await client.execute(deleteApiKeyQuery, [apiKeyString], {
        prepare: true,
      });

      console.log(
        `Successfully deleted 1 record for API key: ${apiKeyString} from api_key_websites table`
      );
    } catch (error) {
      console.error("Error deleting from api_key_websites:", error);
      throw error;
    }
  }

  toJSON() {
    // Extract domain from URL
    let domain = this.url;
    if (this.url) {
      try {
        const urlObj = new URL(
          this.url.startsWith("http") ? this.url : `https://${this.url}`
        );
        domain = urlObj.hostname;
      } catch (error) {
        // If URL parsing fails, use the original URL
        console.warn("Failed to parse URL:", this.url, error.message);
        domain = this.url;
      }
    }

    return {
      website_id: this.website_id,
      id: this.website_id, // Keep for backward compatibility
      name: this.name,
      url: this.url,
      domain: domain,
      customer_id: this.customer_id,
      type: this.type,
      description: this.description,
      status: this.status,
      api_key: this.api_key,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_activity: this.last_activity,
      monthly_events: this.monthly_events,
      tracking_settings: this.tracking_settings,
    };
  }
}
