/* eslint-disable no-undef */
// server.js
import app from "./backend/app.js";
import { createServer } from "http";
import cassandraConnection from "./backend/config/database/init.js";
import socketService from "./backend/app/services/socketService.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3002;

const server = createServer(app);

// Initialize Cassandra connection
async function startServer() {
  try {
    console.log("🔄 Connecting to Cassandra with retry mechanism...");
    await cassandraConnection.connectWithRetries(10, 5000); // 10 attempts, 5s initial delay

    // Initialize Socket.IO
    console.log("🔌 Initializing Socket.IO...");
    socketService.init(server);
    console.log("✅ Socket.IO initialized successfully");

    server.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`📋 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔌 Socket.IO server ready for connections`);
      console.log(
        `📊 Socket.IO Status: ${
          socketService.isInitialized() ? "Ready" : "Not Ready"
        }`
      );
      console.log("💓 Database health monitoring is active");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.log("🔄 Will attempt to restart in 10 seconds...");
    setTimeout(() => {
      startServer();
    }, 10000);
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
