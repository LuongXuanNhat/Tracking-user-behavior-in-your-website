// app.js
import express, { json, urlencoded } from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Trust proxy for IP address
app.set("trust proxy", true);

// Static files
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "public")));

// Routes
import userRoutes from "./app/routes/user.js";
import trackingRoutes from "./app/routes/tracking.js";
import analyticsRoutes from "./app/routes/analytics.js";
import websiteRoutes from "./app/routes/website.js";
import { getValidApiKeys } from "./app/middlewares/apikey.js";
import { Website } from "./app/models/Website.js";

app.use("/api/users", userRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/websites", websiteRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "User Behavior Tracking API is working!",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      tracking: "/api/tracking",
      analytics: "/api/analytics",
      websites: "/api/websites",
    },
    auth: {
      required: true,
      method: "API Key",
      header: "x-api-key",
      alternative: "?api_key=YOUR_KEY",
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Key validation endpoint
app.get("/api/validate-key", (req, res) => {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;

  if (!apiKey) {
    return res.status(400).json({
      status: "error",
      message: "API key is required for validation",
    });
  }

  const validKeys = getValidApiKeys();
  const isValid = validKeys.includes(apiKey);

  if (isValid) {
    res.json({
      status: "success",
      message: "API key is valid",
      key_info: {
        type: apiKey.includes("demo")
          ? "demo"
          : apiKey.includes("test")
          ? "test"
          : "production",
        permissions: {
          tracking: true,
          analytics: true,
          users: !apiKey.includes("demo"),
        },
      },
    });
  } else {
    res.status(401).json({
      status: "error",
      message: "Invalid API key",
    });
  }
});

// Get API keys from environment or default
app.get("/api/keys", (req, res) => {
  const apiKeys = {
    production: process.env.PRODUCTION_API_KEY || "tracking_api_key_123456789",
    demo: process.env.DEMO_API_KEY || "demo_api_key_abcdefg",
    test: process.env.TEST_API_KEY || "test_api_key_xyz",
  };

  res.json({
    status: "success",
    message: "Available API keys for testing",
    data: apiKeys,
    usage: {
      header: "x-api-key: YOUR_API_KEY",
      query: "?api_key=YOUR_API_KEY",
      bearer: "Authorization: Bearer YOUR_API_KEY",
    },
    quick_test: {
      demo_example: `curl -H 'x-api-key: ${apiKeys.demo}' http://localhost:3001/api/analytics/clicks`,
      production_example: `curl -H 'x-api-key: ${apiKeys.production}' http://localhost:3001/api/users`,
    },
  });
});

// Generate new API key for website (POST request with req.body)
app.post("/api/generate-key", (req, res) => {
  const {
    website_name,
    website_url,
    type = "production",
    description = "",
    owner = "user",
  } = req.body;

  if (!website_name || !website_url) {
    return res.status(400).json({
      status: "error",
      message: "website_name and website_url are required",
      required_fields: ["website_name", "website_url"],
      optional_fields: ["type", "description", "owner"],
      example: {
        website_name: "My Portfolio",
        website_url: "https://myportfolio.com",
        type: "production",
        description: "Portfolio website tracking",
      },
    });
  }

  try {
    // Validate URL format
    new URL(website_url);
  } catch {
    return res.status(400).json({
      status: "error",
      message: "Invalid URL format",
      example: "https://example.com",
    });
  }

  // Generate unique API key using Website model
  const newApiKey = Website.generateApiKey(website_name, type);

  // Save to database (in-memory for demo)
  const newWebsite = Website.create({
    name: website_name,
    url: website_url,
    api_key: newApiKey,
    type,
    description,
    owner,
  });

  res.status(201).json({
    status: "success",
    message: `New API key generated for website: ${website_name}`,
    data: {
      website: newWebsite,
      integration_guide: {
        curl_example: `curl -X POST http://localhost:3001/api/tracking/event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${newApiKey}" \\
  -d '{
    "user_id": "user_123",
    "event_type": "click",
    "element_type": "button",
    "page_url": "${website_url}"
  }'`,
        javascript_integration: `
// Add to your HTML <head>
<script src="tracking-script.js"></script>
<script>
  window.userTrackingConfig = {
    apiUrl: "http://localhost:3001/api/tracking",
    apiKey: "${newApiKey}",
    enabled: true
  };
  
  const tracker = new UserTracker(window.userTrackingConfig);
</script>`,
        analytics_example: `curl -H "x-api-key: ${newApiKey}" http://localhost:3001/api/analytics/clicks`,
      },
    },
    note: "🔐 Keep this API key secure! You can manage it via /api/websites endpoints.",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

export default app;
