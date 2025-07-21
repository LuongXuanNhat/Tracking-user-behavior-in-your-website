// models/ApiKey.js
// Model để quản lý API Keys động

import crypto from "crypto";
import fs from "fs";
import path from "path";

// File để lưu trữ API keys (cho demo - thực tế sẽ dùng Cassandra/MongoDB)
const DATA_FILE = path.join(process.cwd(), "data", "api-keys.json");

// In-memory storage cho demo
let apiKeys = new Map(); // Map<apiKey, keyData>
let keyCounter = 1;

export class ApiKey {
  /**
   * Load dữ liệu từ file
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
   * Tạo API key mới cho website
   */
  static create(keyData) {
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
      id: keyCounter++,
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

    apiKeys.set(apiKey, newKey);

    // Auto save after create
    this.saveData();

    return newKey;
  }

  /**
   * Tìm API key và thông tin
   */
  static findByKey(apiKey) {
    return apiKeys.get(apiKey) || null;
  }

  /**
   * Kiểm tra API key có hợp lệ không
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
        return {
          valid: true,
          key: {
            apiKey,
            type: this.getEnvKeyType(apiKey),
            websiteName: "Development Environment",
            permissions: { tracking: true, analytics: true, users: true },
            status: "active",
          },
        };
      }
    }

    const keyData = this.findByKey(apiKey);

    if (!keyData) {
      return { valid: false, reason: "API key not found" };
    }

    if (keyData.status !== "active") {
      return { valid: false, reason: "API key is disabled" };
    }

    if (keyData.expires_at && new Date() > new Date(keyData.expires_at)) {
      return { valid: false, reason: "API key has expired" };
    }

    // Cập nhật thống kê sử dụng
    await this.updateUsage(apiKey);

    return { valid: true, key: keyData };
  }

  /**
   * Cập nhật thống kê sử dụng
   */
  static async updateUsage(apiKey) {
    const keyData = apiKeys.get(apiKey);
    if (keyData) {
      keyData.last_used = new Date().toISOString();
      keyData.usage_count += 1;
      keyData.updated_at = new Date().toISOString();
    }
  }

  /**
   * Vô hiệu hóa API key
   */
  static disable(apiKey, reason = "Manual disable") {
    const keyData = apiKeys.get(apiKey);
    if (keyData) {
      keyData.status = "disabled";
      keyData.disabled_reason = reason;
      keyData.disabled_at = new Date().toISOString();
      keyData.updated_at = new Date().toISOString();

      // Auto save after disable
      this.saveData();

      return true;
    }
    return false;
  }

  /**
   * Gia hạn API key
   */
  static extend(apiKey, extensionDays = 365) {
    const keyData = apiKeys.get(apiKey);
    if (keyData) {
      const currentExpiry = keyData.expires_at
        ? new Date(keyData.expires_at)
        : new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + extensionDays);

      keyData.expires_at = newExpiry.toISOString();
      keyData.updated_at = new Date().toISOString();

      // Auto save after extend
      this.saveData();

      return keyData;
    }
    return null;
  }

  /**
   * Lấy tất cả API keys (cho admin)
   */
  static getAll(filters = {}) {
    let result = Array.from(apiKeys.values());

    if (filters.type) {
      result = result.filter((key) => key.type === filters.type);
    }

    if (filters.status) {
      result = result.filter((key) => key.status === filters.status);
    }

    if (filters.websiteId) {
      result = result.filter((key) => key.websiteId === filters.websiteId);
    }

    // Ẩn API key thực trong response
    return result.map((key) => ({
      ...key,
      apiKey: this.maskApiKey(key.apiKey),
    }));
  }

  /**
   * Lấy tất cả API keys với full data (cho internal use)
   */
  static getAllInternal(filters = {}) {
    let result = Array.from(apiKeys.values());

    if (filters.type) {
      result = result.filter((key) => key.type === filters.type);
    }

    if (filters.status) {
      result = result.filter((key) => key.status === filters.status);
    }

    if (filters.websiteId) {
      result = result.filter((key) => key.websiteId === filters.websiteId);
    }

    return result;
  }

  /**
   * Che giấu API key để hiển thị
   */
  static maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return "****";
    return apiKey.substring(0, 8) + "*".repeat(apiKey.length - 8);
  }

  /**
   * Lấy rate limit mặc định theo loại
   */
  static getDefaultRateLimit(type) {
    const limits = {
      demo: { requests: 100, window: 3600 }, // 100 requests/hour
      test: { requests: 1000, window: 3600 }, // 1000 requests/hour
      production: { requests: 10000, window: 3600 }, // 10000 requests/hour
    };
    return limits[type] || limits.production;
  }

  /**
   * Lấy ngày hết hạn theo loại
   */
  static getExpirationDate(type) {
    if (type === "demo") {
      // Demo keys hết hạn sau 30 ngày
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      return expiry.toISOString();
    }

    if (type === "test") {
      // Test keys hết hạn sau 90 ngày
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      return expiry.toISOString();
    }

    // Production keys hết hạn sau 1 năm
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry.toISOString();
  }

  /**
   * Xác định loại key từ .env (fallback)
   */
  static getEnvKeyType(apiKey) {
    if (apiKey === process.env.DEMO_API_KEY) return "demo";
    if (apiKey === process.env.TEST_API_KEY) return "test";
    if (apiKey === process.env.PRODUCTION_API_KEY) return "production";
    return "unknown";
  }

  /**
   * Khởi tạo dữ liệu mẫu cho development
   */
  static initSampleData() {
    // Load dữ liệu có sẵn trước
    this.loadData();

    if (process.env.NODE_ENV === "development" && apiKeys.size === 0) {
      console.log("🔄 Initializing sample API keys...");

      // Tạo một số API keys mẫu
      this.create({
        websiteId: 1,
        websiteName: "Example Website",
        websiteUrl: "https://example.com",
        type: "production",
        description: "Sample production key",
        owner: "admin",
      });

      this.create({
        websiteId: 2,
        websiteName: "Demo Site",
        websiteUrl: "https://demo.example.com",
        type: "demo",
        description: "Demo website key",
        owner: "demo_user",
      });

      this.create({
        websiteId: 3,
        websiteName: "Test Environment",
        websiteUrl: "https://test.example.com",
        type: "test",
        description: "Test environment key",
        owner: "developer",
      });

      console.log("✅ Sample API keys initialized");
    } else if (apiKeys.size > 0) {
      console.log(`✅ Loaded ${apiKeys.size} existing API keys`);
    }
  }

  /**
   * Khởi tạo hệ thống (gọi từ bất kỳ đâu)
   */
  static init() {
    this.loadData();
    return this;
  }
}

// Khởi tạo dữ liệu mẫu khi import
ApiKey.initSampleData();
