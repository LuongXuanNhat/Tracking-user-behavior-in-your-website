// backend/app/routes/health.js
// Health check endpoints for database and system monitoring
/* eslint-disable no-undef */
import express from "express";
import dbResilience from "../helpers/dbResilience.js";
import cassandraConnection from "../../config/database/init.js";

const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get("/", async (req, res) => {
  try {
    const healthStatus = await dbResilience.healthCheck();

    const response = {
      status: healthStatus.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: healthStatus.healthy,
        connectedHosts: healthStatus.connectedHosts,
        message: healthStatus.message,
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    };

    const statusCode = healthStatus.healthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false,
        connectedHosts: 0,
        message: "Database connection failed",
      },
    });
  }
});

/**
 * GET /health/database
 * Detailed database health check
 */
router.get("/database", async (req, res) => {
  try {
    const client = cassandraConnection.getClient();
    const connectedHosts = client.getState().getConnectedHosts();
    const allHosts = Array.from(client.hosts.values());

    // Test query performance
    const startTime = Date.now();
    await client.execute("SELECT release_version FROM system.local");
    const queryTime = Date.now() - startTime;

    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      cluster: {
        name: client.options.protocolOptions.port
          ? "UserLogCluster"
          : "Unknown",
        totalHosts: allHosts.length,
        connectedHosts: connectedHosts.length,
        hosts: allHosts.map((host) => ({
          address: host.address,
          datacenter: host.datacenter,
          rack: host.rack,
          status: host.isUp() ? "UP" : "DOWN",
        })),
      },
      performance: {
        queryTime: `${queryTime}ms`,
        connectionPool: {
          coreConnections: client.options.pooling.coreConnectionsPerHost,
          maxConnections: client.options.pooling.maxConnectionsPerHost,
        },
      },
      configuration: {
        consistency: cassandraConnection.getConsistencyLevel(),
        localDataCenter: client.options.localDataCenter,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      details: "Failed to get database status",
    });
  }
});

/**
 * POST /health/database/reconnect
 * Force database reconnection
 */
router.post("/database/reconnect", async (req, res) => {
  try {
    console.log("🔄 Manual reconnection requested via API");
    await cassandraConnection.reconnect();

    const healthStatus = await dbResilience.healthCheck();

    res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      message: "Database reconnection completed",
      result: healthStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Failed to reconnect to database",
      error: error.message,
    });
  }
});

/**
 * GET /health/resilience-test
 * Run a quick resilience test
 */
router.get("/resilience-test", async (req, res) => {
  try {
    const testCount = 5;

    console.log(
      `🧪 Running resilience test with ${testCount} concurrent queries...`
    );

    const promises = [];
    for (let i = 0; i < testCount; i++) {
      promises.push(
        dbResilience
          .executeWithRetry("SELECT release_version FROM system.local", [], {
            timeout: 5000,
          })
          .then((result) => ({
            success: true,
            version: result.rows[0].release_version,
          }))
          .catch((error) => ({ success: false, error: error.message }))
      );
    }

    const testResults = await Promise.all(promises);
    const successCount = testResults.filter((r) => r.success).length;

    res.json({
      status: "completed",
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: testCount,
        successful: successCount,
        failed: testCount - successCount,
        successRate: `${((successCount / testCount) * 100).toFixed(1)}%`,
      },
      details: testResults,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Resilience test failed",
      error: error.message,
    });
  }
});

export default router;
