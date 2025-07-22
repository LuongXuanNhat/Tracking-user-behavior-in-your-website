#!/usr/bin/env node
// test-import.js
// Test import của ApiKey để debug

import dotenv from "dotenv";
dotenv.config();

console.log("🔍 Testing ApiKey import...");

try {
  const { ApiKey } = await import("./backend/app/models/ApiKey.js");
  console.log("✅ ApiKey import successful:", typeof ApiKey);
  console.log(
    "✅ ApiKey methods:",
    Object.getOwnPropertyNames(ApiKey).filter(
      (name) => name !== "length" && name !== "name" && name !== "prototype"
    )
  );
} catch (error) {
  console.error("❌ ApiKey import failed:", error.message);
  console.error("Stack:", error.stack);
}
