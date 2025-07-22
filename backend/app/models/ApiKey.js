// models/ApiKey.js
// Model để quản lý API Keys với Cassandra integration

import crypto from "crypto";
import fs from "fs";
import path from "path";
import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

// File để lưu trữ API keys (fallback - primary storage là Cassandra)
const DATA_FILE = path.join(process.cwd(), "data", "api-keys.json");

// In-memory storage cho fallback
let apiKeys = new Map(); // Map<apiKey, keyData>
let keyCounter = 1;

export class ApiKey {
  /**
   * Initialize Cassandra table nếu chưa có
   */
  static async initializeCassandra() {
    try {
      const client = cassandraConnection.getClient();

      // Create api_keys table if not exists
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY,
          api_key TEXT,
          website_id BIGINT,
          website_name TEXT,
          website_url TEXT,
          type TEXT,
          description TEXT,
          owner TEXT,
          status TEXT,
          permissions MAP<TEXT, TEXT>,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          last_used TIMESTAMP,
          usage_count BIGINT,
          expires_at TIMESTAMP
        )
      `;

      await client.execute(createTableQuery);

      // Create index on api_key for fast lookups
      const createIndexQuery = `
        CREATE INDEX IF NOT EXISTS api_keys_api_key_idx 
        ON api_keys (api_key)
      `;

      await client.execute(createIndexQuery);

      console.log("✅ ApiKey Cassandra tables initialized");
    } catch (error) {
      console.error("❌ Failed to initialize ApiKey Cassandra tables:", error);
      // Fallback to file storage
      this.loadData();
    }
  }

  /**
   * Load dữ liệu từ Cassandra
   */
  static async loadFromCassandra() {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM api_keys ALLOW FILTERING";
      const result = await client.execute(query);

      apiKeys.clear();
      result.rows.forEach((row) => {
        const keyData = {
          id: row.id.toString(),
          apiKey: row.api_key,
          websiteId: row.website_id,
          websiteName: row.website_name,
          websiteUrl: row.website_url,
          type: row.type,
          description: row.description,
          owner: row.owner,
          status: row.status,
          permissions: row.permissions || {},
          created_at: row.created_at,
          updated_at: row.updated_at,
          last_used: row.last_used,
          usage_count: row.usage_count || 0,
          expires_at: row.expires_at,
        };
        apiKeys.set(row.api_key, keyData);
      });

      console.log(`✅ Loaded ${apiKeys.size} API keys from Cassandra`);
    } catch (error) {
      console.error(
        "❌ Failed to load from Cassandra, fallback to file:",
        error
      );
      this.loadData();
    }
  }

  /**
   * Save API key to Cassandra
   */
  static async saveToCassandra(keyData) {
    try {
      const client = cassandraConnection.getClient();

      // Convert permissions object to simple map
      const permissionsMap = {};
      Object.keys(keyData.permissions).forEach((key) => {
        permissionsMap[key] = String(keyData.permissions[key]);
      });

      const query = `
        INSERT INTO api_keys (
          id, api_key, website_id, website_name, website_url,
          type, description, owner, status, permissions,
          created_at, updated_at, last_used, usage_count, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        keyData.id, // id (UUID) - use the UUID from keyData
        keyData.apiKey, // api_key (TEXT)
        keyData.websiteId, // website_id (UUID)
        keyData.websiteName, // website_name (TEXT)
        keyData.websiteUrl, // website_url (TEXT)
        keyData.type, // type (TEXT)
        keyData.description, // description (TEXT)
        keyData.owner, // owner (TEXT)
        keyData.status, // status (TEXT)
        permissionsMap, // permissions (MAP)
        new Date(keyData.created_at), // created_at (TIMESTAMP)
        new Date(keyData.updated_at), // updated_at (TIMESTAMP)
        keyData.last_used ? new Date(keyData.last_used) : null, // last_used (TIMESTAMP)
        parseInt(keyData.usage_count) || 0, // usage_count (BIGINT)
        keyData.expires_at ? new Date(keyData.expires_at) : null, // expires_at (TIMESTAMP)
      ];

      await client.execute(query, params, { prepare: true });
      console.log(
        `✅ API key saved to Cassandra: ${keyData.apiKey.substring(0, 20)}...`
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to save to Cassandra:", error);
      return false;
    }
  }

  /**
   * Load dữ liệu từ file (fallback)
   */
  static loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        apiKeys.clear();

        // Load API keys
        if (data.apiKeys) {
          for (const [key, value] of Object.entries(data.apiKeys)) {
            apiKeys.set(key, value);
          }
        }

        // Load counter
        if (data.keyCounter) {
          keyCounter = data.keyCounter;
        }

        console.log(`✅ Loaded ${apiKeys.size} API keys from storage`);
      } else {
        console.log("📄 No existing data file found, starting fresh");
      }
    } catch (error) {
      console.error("❌ Error loading data:", error.message);
    }
  }

  /**
   * Save dữ liệu ra file
   */
  static saveData() {
    try {
      // Tạo thư mục nếu chưa có
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const data = {
        keyCounter,
        apiKeys: Object.fromEntries(apiKeys),
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${apiKeys.size} API keys to storage`);
    } catch (error) {
      console.error("❌ Error saving data:", error.message);
    }
  }

  /**
   * Sinh API key mới
   */
  static generateApiKey() {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString("hex");
    return `tk_${timestamp}_${randomBytes}`;
  }

  /**
   * Tạo API key mới cho website với Cassandra integration
   */
  static async create(keyData) {
    const {
      websiteId,
      websiteName,
      websiteUrl,
      type = "production",
      description = "",
      owner = "system",
      permissions = {},
    } = keyData;

    const apiKey = this.generateApiKey();

    const newKey = {
      id: uuidv4(), // Use UUID instead of counter for Cassandra compatibility
      apiKey,
      websiteId,
      websiteName,
      websiteUrl,
      type,
      description,
      owner,
      status: "active",
      permissions: {
        tracking: true,
        analytics: true,
        users: type !== "demo",
        rateLimit: this.getDefaultRateLimit(type),
        ...permissions,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used: null,
      usage_count: 0,
      expires_at: this.getExpirationDate(type),
    };

    // Save to in-memory cache
    apiKeys.set(apiKey, newKey);

    // Try to save to Cassandra first
    const cassandraSaved = await this.saveToCassandra(newKey);

    // Fallback to file if Cassandra fails
    if (!cassandraSaved) {
      console.log("⚠️  Cassandra save failed, falling back to file storage");
      this.saveData();
    }

    return newKey;
  }

  /**
   * Tìm API key từ Cassandra hoặc cache
   */
  static async findByKey(apiKey) {
    // Check in-memory cache first
    let keyData = apiKeys.get(apiKey);

    if (!keyData) {
      // Try to find in Cassandra
      try {
        const client = cassandraConnection.getClient();
        const query =
          "SELECT * FROM api_keys WHERE api_key = ? LIMIT 1 ALLOW FILTERING";
        const result = await client.execute(query, [apiKey], { prepare: true });

        if (result.rows.length > 0) {
          const row = result.rows[0];
          keyData = {
            id: row.id.toString(),
            apiKey: row.api_key,
            websiteId: row.website_id,
            websiteName: row.website_name,
            websiteUrl: row.website_url,
            type: row.type,
            description: row.description,
            owner: row.owner,
            status: row.status,
            permissions: row.permissions || {},
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_used: row.last_used,
            usage_count: row.usage_count || 0,
            expires_at: row.expires_at,
          };

          // Cache it for future use
          apiKeys.set(apiKey, keyData);
        }
      } catch (error) {
        console.error("❌ Error finding API key in Cassandra:", error);
      }
    }

    return keyData || null;
  }

  /**
   * Kiểm tra API key có hợp lệ không với Cassandra integration
   */
  static async validate(apiKey) {
    // Fallback to .env keys for development
    if (process.env.NODE_ENV === "development") {
      const envKeys = [
        process.env.PRODUCTION_API_KEY,
        process.env.DEMO_API_KEY,
        process.env.TEST_API_KEY,
      ].filter(Boolean);

      if (envKeys.includes(apiKey)) {
        const keyType = this.getEnvKeyType(apiKey);
        return {
          valid: true,
          key: {
            apiKey,
            type: keyType,
            websiteName: "Development Environment",
            permissions: {
              tracking: true,
              analytics: true,
              users: keyType !== "demo",
            },
            status: "active",
          },
        };
      }
    }

    const keyData = await this.findByKey(apiKey);

    if (!keyData) {
      return { valid: false, reason: "API key not found" };
    }

    // Kiểm tra status
    if (keyData.status !== "active") {
      return { valid: false, reason: "API key is disabled" };
    }

    // Kiểm tra expiration
    if (keyData.expires_at && new Date() > new Date(keyData.expires_at)) {
      return { valid: false, reason: "API key has expired" };
    }

    // Update usage stats
    keyData.last_used = new Date().toISOString();
    keyData.usage_count = (keyData.usage_count || 0) + 1;

    // Save updated stats
    apiKeys.set(apiKey, keyData);

    return { valid: true, key: keyData };
  }

  /**
   * Get env key type helper
   */
  static getEnvKeyType(apiKey) {
    if (apiKey === process.env.DEMO_API_KEY) return "demo";
    if (apiKey === process.env.TEST_API_KEY) return "test";
    if (apiKey === process.env.PRODUCTION_API_KEY) return "production";
    return "unknown";
  }

  /**
   * Get default rate limit
   */
  static getDefaultRateLimit(type) {
    const limits = {
      demo: 100,
      test: 1000,
      production: 10000,
    };
    return limits[type] || 1000;
  }

  /**
   * Get expiration date
   */
  static getExpirationDate(type) {
    const now = new Date();
    const expirationDays = {
      demo: 30,
      test: 90,
      production: 365,
    };

    const days = expirationDays[type] || 365;
    now.setDate(now.getDate() + days);
    return now.toISOString();
  }

  /**
   * Initialize system (for backward compatibility)
   */
  static init() {
    this.loadData();
  }

  /**
   * Get all API keys
   */
  static getAll(filters = {}) {
    let keys = Array.from(apiKeys.values());

    if (filters.type) {
      keys = keys.filter((key) => key.type === filters.type);
    }

    if (filters.status) {
      keys = keys.filter((key) => key.status === filters.status);
    }

    if (filters.websiteId) {
      keys = keys.filter((key) => key.websiteId === filters.websiteId);
    }

    return keys;
  }

  /**
   * Disable API key
   */
  static disable(apiKey, reason = "Disabled by admin") {
    const keyData = apiKeys.get(apiKey);
    if (keyData) {
      keyData.status = "disabled";
      keyData.disabled_reason = reason;
      keyData.disabled_at = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }

  /**
   * Extend API key
   */
  static extend(apiKey, extensionDays = 365) {
    const keyData = apiKeys.get(apiKey);
    if (keyData) {
      const currentExpiry = new Date(keyData.expires_at);
      currentExpiry.setDate(currentExpiry.getDate() + extensionDays);
      keyData.expires_at = currentExpiry.toISOString();
      keyData.updated_at = new Date().toISOString();
      this.saveData();
      return keyData;
    }
    return null;
  }

  /**
   * Mask API key for display
   */
  static maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return "****";
    return apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
  }

  // Getter for accessing the Map (for compatibility)
  static get apiKeys() {
    return apiKeys;
  }
}
