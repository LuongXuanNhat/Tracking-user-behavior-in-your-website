/* eslint-disable no-undef */
// middlewares/apikey.js
// Middleware kiểm tra API Key động từ database

// import { ApiKey } from "../models/ApiKey.js";
import { Website } from "../models/Website.js";

/**
 * Middleware kiểm tra API Key động
 */
export async function validateApiKey(req, res, next) {
  try {
    console.log("=== API Key Validation Start ===");
    console.log("Body: ", req.body);
    // console.log("Kiểm tra header x-api-key: ", req.headers);
    // Lấy API key từ header
    const apiKey = req.headers["x-api-key"];

    // Nếu bắt buộc nhưng không có API key
    if (!apiKey) {
      return res.status(401).json({
        status: "error",
        message: "API key is required",
        error: "Missing API key in request headers (x-api-key)",
      });
    }

    if (
      apiKey === process.env.DEMO_API_KEY ||
      apiKey === process.env.TEST_API_KEY ||
      apiKey === process.env.PRODUCTION_API_KEY
    ) {
      console.log("API key matched environment variable");
      req.apiKeyValidated = true;
      req.apiKeySource = "environment";
      return next();
    }

    console.log("Checking database...");
    // Xác thực API key từ database
    const websiteExists = await Website.existsByApiKey(apiKey);
    console.log("Website exists in DB:", websiteExists);

    if (!websiteExists) {
      console.log("Invalid API key");
      return res.status(401).json({
        status: "error",
        message: "Invalid API key",
        error: "The provided API key is not valid or has been revoked",
      });
    }

    // Lấy thông tin website tương ứng với API key
    console.log("Fetching website details...");
    const website = await Website.findByApiKey(apiKey);

    if (!website) {
      console.log("Website not found");
      return res.status(401).json({
        status: "error",
        message: "Website not found",
        error: "No website associated with this API key",
      });
    }

    // Kiểm tra trạng thái website
    console.log("Website status:", website.status);
    if (website.status !== "active") {
      console.log("Website not active");
      return res.status(403).json({
        status: "error",
        message: "Website access suspended",
        error: `Website status is ${website.status}`,
      });
    }

    console.log("API key validation successful");
    req.website = website;
    req.apiKeyValidated = true;
    req.apiKeySource = "database";
    console.log("=== API Key Validation End ===");
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({
      status: "error",
      message: "API key validation error",
      error: error.message,
    });
  }
}
