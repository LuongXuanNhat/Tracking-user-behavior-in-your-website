/* eslint-disable no-undef */
// server.js
import app from "./backend/app.js";
import { createServer } from "http";
import cassandraConnection from "./backend/config/database/init.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3002;

const server = createServer(app);

// Initialize Cassandra connection
async function startServer() {
  try {
    console.log("🔄 Connecting to Cassandra...");
    await cassandraConnection.connect();

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
