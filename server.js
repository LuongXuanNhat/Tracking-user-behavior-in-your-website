/* eslint-disable no-undef */
// server.js
import app from "./backend/app.js";
import { createServer } from "http";
import cassandraConnection from "./backend/config/database/init.js";
import { ApiKey } from "./backend/app/models/ApiKey.js";
import { Customer } from "./backend/app/models/Customer.js";
import { Website } from "./backend/app/models/Website.js";
import { Event } from "./backend/app/models/Event.js";
import { User } from "./backend/app/models/User.js";

const PORT = process.env.PORT || 3002;

const server = createServer(app);

// Initialize Cassandra connection
async function startServer() {
  try {
    console.log("🔄 Connecting to Cassandra...");
    await cassandraConnection.connect();

    // Initialize all models' Cassandra tables
    console.log("🔄 Initializing database models...");
    await ApiKey.initializeCassandra();
    await Customer.initializeCassandra();
    await Website.initializeCassandra();
    await Event.initializeCassandra();
    await User.initializeCassandra();

    // Load existing API keys from Cassandra
    await ApiKey.loadFromCassandra();

    console.log("✅ Database models initialized successfully");

    server.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`📋 API Documentation: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔄 Shutting down server...");
  await cassandraConnection.disconnect();
  server.close(() => {
    console.log("✅ Server shutdown complete");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down...");
  await cassandraConnection.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

startServer();
