#!/usr/bin/env node
// tools/api-key-manager.js
// CLI tool để quản lý API Keys

import { program } from "commander";
import { ApiKey } from "../backend/app/models/ApiKey.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Khởi tạo ApiKey system
ApiKey.init();

program
  .name("api-key-manager")
  .description("CLI tool for managing API keys")
  .version("1.0.0");

// Tạo API key mới
program
  .command("create")
  .description("Create a new API key")
  .option("-n, --name <name>", "Website name")
  .option("-u, --url <url>", "Website URL")
  .option("-t, --type <type>", "Key type (demo|test|production)", "production")
  .option("-d, --description <description>", "Description")
  .action((options) => {
    if (!options.name || !options.url) {
      console.error("❌ Website name and URL are required");
      console.log(
        'Usage: npm run key:create -- -n "My Website" -u "https://example.com"'
      );
      process.exit(1);
    }

    try {
      const newKey = ApiKey.create({
        websiteId: Date.now(),
        websiteName: options.name,
        websiteUrl: options.url,
        type: options.type,
        description: options.description || "",
        owner: "cli-admin",
      });

      console.log("✅ API Key created successfully!");
      console.log("");
      console.log("📋 Key Details:");
      console.log(`   ID: ${newKey.id}`);
      console.log(`   Website: ${newKey.websiteName}`);
      console.log(`   URL: ${newKey.websiteUrl}`);
      console.log(`   Type: ${newKey.type}`);
      console.log(`   Status: ${newKey.status}`);
      console.log(`   Created: ${newKey.created_at}`);
      console.log(`   Expires: ${newKey.expires_at}`);
      console.log("");
      console.log("🔑 API Key (copy this immediately):");
      console.log(`   ${newKey.apiKey}`);
      console.log("");
      console.log(
        "⚠️  Important: Store this key securely. It will not be shown again."
      );
    } catch (error) {
      console.error("❌ Failed to create API key:", error.message);
      process.exit(1);
    }
  });

// Liệt kê API keys
program
  .command("list")
  .description("List all API keys")
  .option("-t, --type <type>", "Filter by type")
  .option("-s, --status <status>", "Filter by status")
  .action((options) => {
    try {
      const filters = {};
      if (options.type) filters.type = options.type;
      if (options.status) filters.status = options.status;

      const keys = ApiKey.getAll(filters);

      if (keys.length === 0) {
        console.log("📝 No API keys found");
        return;
      }

      console.log(`📋 Found ${keys.length} API key(s):`);
      console.log("");

      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.websiteName}`);
        console.log(`   ID: ${key.id}`);
        console.log(`   URL: ${key.websiteUrl}`);
        console.log(`   Type: ${key.type}`);
        console.log(`   Status: ${key.status}`);
        console.log(`   Key: ${key.apiKey}`);
        console.log(`   Usage: ${key.usage_count} requests`);
        console.log(`   Last used: ${key.last_used || "Never"}`);
        console.log(`   Created: ${key.created_at}`);
        console.log("   ---");
      });
    } catch (error) {
      console.error("❌ Failed to list API keys:", error.message);
      process.exit(1);
    }
  });

// Vô hiệu hóa API key
program
  .command("disable")
  .description("Disable an API key")
  .argument("<keyId>", "API key ID")
  .option("-r, --reason <reason>", "Reason for disabling")
  .action((keyId, options) => {
    try {
      // Tìm key theo ID
      const allKeys = ApiKey.getAllInternal();
      const keyData = allKeys.find((key) => key.id === parseInt(keyId));

      if (!keyData) {
        console.error(`❌ API key with ID ${keyId} not found`);
        process.exit(1);
      }

      const reason = options.reason || "Disabled via CLI";
      const success = ApiKey.disable(keyData.apiKey, reason);

      if (success) {
        console.log("✅ API key disabled successfully!");
        console.log(`   ID: ${keyData.id}`);
        console.log(`   Website: ${keyData.websiteName}`);
        console.log(`   Reason: ${reason}`);
      } else {
        console.error("❌ Failed to disable API key");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Failed to disable API key:", error.message);
      process.exit(1);
    }
  });

// Thống kê API keys
program
  .command("stats")
  .description("Show API key statistics")
  .action(() => {
    try {
      const allKeys = ApiKey.getAllInternal(); // Sử dụng internal method

      const stats = {
        total: allKeys.length,
        active: allKeys.filter((key) => key.status === "active").length,
        disabled: allKeys.filter((key) => key.status === "disabled").length,
        expired: allKeys.filter(
          (key) => key.expires_at && new Date() > new Date(key.expires_at)
        ).length,
        byType: {
          demo: allKeys.filter((key) => key.type === "demo").length,
          test: allKeys.filter((key) => key.type === "test").length,
          production: allKeys.filter((key) => key.type === "production").length,
        },
        totalUsage: allKeys.reduce(
          (sum, key) => sum + (key.usage_count || 0),
          0
        ),
      };

      console.log("📊 API Key Statistics:");
      console.log("");
      console.log(`📝 Total keys: ${stats.total}`);
      console.log(`✅ Active: ${stats.active}`);
      console.log(`❌ Disabled: ${stats.disabled}`);
      console.log(`⏰ Expired: ${stats.expired}`);
      console.log("");
      console.log("📈 By Type:");
      console.log(`   Demo: ${stats.byType.demo}`);
      console.log(`   Test: ${stats.byType.test}`);
      console.log(`   Production: ${stats.byType.production}`);
      console.log("");
      console.log(`🚀 Total API calls: ${stats.totalUsage}`);

      // Hiển thị keys được sử dụng nhiều nhất
      const mostUsed = allKeys
        .filter((key) => key.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 3);

      if (mostUsed.length > 0) {
        console.log("");
        console.log("🔥 Most used keys:");
        mostUsed.forEach((key, index) => {
          console.log(
            `   ${index + 1}. ${key.websiteName}: ${key.usage_count} calls`
          );
        });
      }
    } catch (error) {
      console.error("❌ Failed to get statistics:", error.message);
      process.exit(1);
    }
  });

// Kiểm tra API key
program
  .command("check")
  .description("Check if an API key is valid")
  .argument("<apiKey>", "API key to check")
  .action(async (apiKey) => {
    try {
      const validation = await ApiKey.validate(apiKey);

      if (validation.valid) {
        const key = validation.key;
        console.log("✅ API key is valid!");
        console.log("");
        console.log("📋 Key Details:");
        console.log(`   Website: ${key.websiteName || "N/A"}`);
        console.log(`   Type: ${key.type}`);
        console.log(`   Status: ${key.status || "active"}`);
        console.log(`   Usage: ${key.usage_count || 0} requests`);
        console.log(`   Last used: ${key.last_used || "Never"}`);

        if (key.expires_at) {
          const expiryDate = new Date(key.expires_at);
          const now = new Date();
          const daysUntilExpiry = Math.ceil(
            (expiryDate - now) / (1000 * 60 * 60 * 24)
          );
          console.log(
            `   Expires: ${key.expires_at} (in ${daysUntilExpiry} days)`
          );
        }

        console.log("");
        console.log("🔐 Permissions:");
        const permissions = key.permissions || {};
        console.log(`   Tracking: ${permissions.tracking ? "✅" : "❌"}`);
        console.log(`   Analytics: ${permissions.analytics ? "✅" : "❌"}`);
        console.log(`   Users: ${permissions.users ? "✅" : "❌"}`);
      } else {
        console.log("❌ API key is invalid");
        console.log(`   Reason: ${validation.reason}`);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Failed to check API key:", error.message);
      process.exit(1);
    }
  });

program.parse();
