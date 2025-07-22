/* eslint-disable no-undef */
// config/database/init.js
// Cassandra database connection configuration
import cassandra from "cassandra-driver";

class CassandraConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new cassandra.Client({
        contactPoints: [process.env.CASSANDRA_HOSTS || "127.0.0.1"],
        localDataCenter:
          process.env.CASSANDRA_LOCAL_DATA_CENTER || "datacenter1",
        keyspace: process.env.CASSANDRA_KEYSPACE || "user_logs",
        protocolOptions: {
          port: 9042,
        },
      });

      await this.client.connect();
      this.isConnected = true;
      console.log("✅ Connected to Cassandra successfully");

      return this.client;
    } catch (error) {
      console.error("❌ Failed to connect to Cassandra:", error);
      throw error;
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error("Cassandra client not connected. Call connect() first.");
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.shutdown();
      this.isConnected = false;
      console.log("✅ Disconnected from Cassandra");
    }
  }
}

// Create singleton instance
const cassandraConnection = new CassandraConnection();

export default cassandraConnection;
