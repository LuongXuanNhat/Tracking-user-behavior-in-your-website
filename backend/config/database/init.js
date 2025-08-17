/* eslint-disable no-undef */
// config/database/init.js
// Cassandra database connection configuration
import cassandra from "cassandra-driver";

// Export cassandra types for use in other modules
export const { types } = cassandra;

class CassandraConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Simplified contact points configuration
      const contactPoints = ["127.0.0.1"]; // Direct connection to node 1

      const clientOptions = {
        contactPoints: contactPoints,
        localDataCenter:
          process.env.CASSANDRA_LOCAL_DATA_CENTER || "datacenter1",
        // Don't specify keyspace initially to test basic connection

        // Basic protocol options
        protocolOptions: {
          port: 9042, // Direct port
        },

        // Simplified socket options
        socketOptions: {
          connectTimeout: 5000, // 5 seconds connection timeout
          readTimeout: 12000, // 12 seconds read timeout
          keepAlive: true,
        },

        // Simplified query options
        queryOptions: {
          consistency: cassandra.types.consistencies.localQuorum,
          fetchSize: 1000,
          prepare: true,
        },

        // Basic retry policy
        policies: {
          retry: new cassandra.policies.retry.RetryPolicy(),
        },
      };

      // Add authentication if credentials are provided
      if (process.env.CASSANDRA_USERNAME && process.env.CASSANDRA_PASSWORD) {
        clientOptions.authProvider = new cassandra.auth.PlainTextAuthProvider(
          process.env.CASSANDRA_USERNAME,
          process.env.CASSANDRA_PASSWORD
        );
      }

      this.client = new cassandra.Client(clientOptions);

      await this.client.connect();
      this.isConnected = true;

      console.log("✅ Connected to Cassandra successfully");
      console.log(
        `📊 Connection info: ${contactPoints.join(", ")} (${
          this.client.getState().getConnectedHosts().length
        } hosts connected)`
      );

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

    // Check if the client is still healthy
    if (this.client.getState().getConnectedHosts().length === 0) {
      console.warn("⚠️  No connected hosts found, client may be unhealthy");
      this.isConnected = false;
      throw new Error(
        "Cassandra client has no connected hosts. Reconnection required."
      );
    }

    return this.client;
  }

  async reconnect() {
    console.log("🔄 Attempting to reconnect to Cassandra...");
    if (this.client) {
      try {
        await this.client.shutdown();
      } catch (error) {
        console.warn("Warning during client shutdown:", error.message);
      }
    }
    this.client = null;
    this.isConnected = false;

    return await this.connect();
  }

  async ensureConnection() {
    try {
      if (!this.client || !this.isConnected) {
        return await this.connect();
      }

      // Check if client has connected hosts
      if (this.client.getState().getConnectedHosts().length === 0) {
        return await this.reconnect();
      }

      return this.client;
    } catch (error) {
      console.error("Failed to ensure connection:", error);
      throw error;
    }
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
