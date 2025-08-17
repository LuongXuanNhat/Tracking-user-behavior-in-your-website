/* eslint-disable no-undef */
// test-db-connection.js
// Test script to verify Cassandra connection

import cassandra from "cassandra-driver";
import dotenv from "dotenv";

dotenv.config();

async function testSimpleConnection() {
  try {
    console.log("🔄 Testing simple Cassandra connection...");
    console.log("🔧 Config:", {
      host: "127.0.0.1",
      port: 9042,
      datacenter: process.env.CASSANDRA_LOCAL_DATA_CENTER || "datacenter1",
    });

    const client = new cassandra.Client({
      contactPoints: ["127.0.0.1"],
      localDataCenter: process.env.CASSANDRA_LOCAL_DATA_CENTER || "datacenter1",
      protocolOptions: {
        port: 9042,
      },
      socketOptions: {
        connectTimeout: 5000,
        readTimeout: 10000,
      },
    });

    await client.connect();
    console.log("✅ Successfully connected to Cassandra");

    // Test a simple query
    const result = await client.execute(
      "SELECT cluster_name FROM system.local"
    );
    console.log("✅ Query executed successfully:", result.rows[0]);

    // Check if keyspace exists
    try {
      const keyspaceResult = await client.execute(
        `SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?`,
        [process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics"]
      );
      if (keyspaceResult.rows.length > 0) {
        console.log(
          "✅ Keyspace exists:",
          keyspaceResult.rows[0].keyspace_name
        );
      } else {
        console.log(
          "⚠️  Keyspace does not exist:",
          process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics"
        );
      }
    } catch (keyspaceError) {
      console.log("⚠️  Error checking keyspace:", keyspaceError.message);
    }

    await client.shutdown();
    console.log("✅ Disconnected successfully");
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.error("Full error:", error);
  }

  process.exit(0);
}

testSimpleConnection();
