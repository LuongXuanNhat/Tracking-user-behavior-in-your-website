// app.js
import express, { json, urlencoded } from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Trust proxy for IP address
app.set("trust proxy", true);

// Static files (nếu cần)
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "public")));

// Routes
import userRoutes from "./app/routes/user.js";
import trackingRoutes from "./app/routes/tracking.js";
import analyticsRoutes from "./app/routes/analytics.js";

app.use("/api/users", userRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/analytics", analyticsRoutes);

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
