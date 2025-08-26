/* eslint-disable no-undef */
// config/database/init.js
// Cassandra database connection configuration
import cassandra from "cassandra-driver";
const { distance } = cassandra.types;
// Export cassandra types for use in other modules
export const { types } = cassandra;

class CassandraConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectInterval = null;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
  }

  // Helper method to get consistency level from environment
  getConsistencyLevel() {
    const level = process.env.CASSANDRA_CONSISTENCY_LEVEL || "one"; // Changed to 'one' for better resilience
    const { consistencies } = cassandra.types;

    switch (level.toLowerCase()) {
      case "one":
        return consistencies.one;
      case "localone":
        return consistencies.localOne;
      case "quorum":
        return consistencies.quorum;
      case "localquorum":
        return consistencies.localQuorum;
      case "all":
        return consistencies.all;
      default:
        return consistencies.one; // Default to 'one' for better resilience
    }
  }

  // Start periodic health checks
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.client || !this.isConnected) {
          console.log(
            "🔄 Health check: No connection, attempting to reconnect..."
          );
          await this.connect();
          return;
        }

        // Check connected hosts
        const connectedHosts = this.client.getState().getConnectedHosts();
        if (connectedHosts.length === 0) {
          console.log("⚠️ Health check: No connected hosts, reconnecting...");
          await this.reconnect();
          return;
        }

        // Test with a simple query
        await this.client.execute(
          "SELECT release_version FROM system.local",
          [],
          {
            consistency: cassandra.types.consistencies.one,
            timeout: 3000,
          }
        );

        this.lastHealthCheck = Date.now();

        // Only log if there was a recent issue
        if (connectedHosts.length < 2) {
          console.log(
            `💓 Health check OK - ${connectedHosts.length} host(s) connected`
          );

          // Log detailed information about connected containers/hosts
          connectedHosts.forEach((host, index) => {
            console.log(
              `   📦 Connected Container ${index + 1}: ${host.address}:${
                host.port
              } (DC: ${host.datacenter}, Rack: ${host.rack})`
            );
          });
        }
      } catch (error) {
        console.log(
          `❌ Health check failed: ${error.message}, attempting reconnection...`
        );
        await this.reconnect();
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop health checks
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async connect() {
    try {
      // Multiple contact points for high availability - có thể cấu hình từ env
      let contactPoints;

      if (process.env.CASSANDRA_CONTACT_POINTS) {
        // Parse từ environment variable: "127.0.0.1:9042,127.0.0.1:9043,127.0.0.1:9044"
        contactPoints = process.env.CASSANDRA_CONTACT_POINTS.split(",").map(
          (point) => point.trim()
        );
      } else {
        // Default configuration - kết nối đến tất cả 3 nodes
        contactPoints = [
          "127.0.0.1:9042", // cassandra-node1
          "127.0.0.1:9043", // cassandra-node2
          "127.0.0.1:9044", // cassandra-node3
        ];
      }

      console.log(`🔗 Attempting to connect to: ${contactPoints.join(", ")}`);

      const clientOptions = {
        contactPoints: contactPoints,
        localDataCenter:
          process.env.CASSANDRA_LOCAL_DATA_CENTER || "datacenter1",
        // Don't specify keyspace initially to test basic connection
        pooling: {
          coreConnectionsPerHost: {
            [distance.local]: 2,
            [distance.remote]: 1,
          },
          maxConnectionsPerHost: {
            [distance.local]: 4,
            [distance.remote]: 2,
          },
          maxRequestsPerConnection: 256,
          warmup: false, // Keep disabled to avoid hanging
        },
        // Remove protocolOptions.port since we're specifying ports in contactPoints

        // Optimized socket options for better performance and faster failover
        socketOptions: {
          connectTimeout: 8000, // Tăng connect timeout
          readTimeout: 15000, // Tăng read timeout để phù hợp với server
          keepAlive: true,
          keepAliveDelay: 30000,
          tcpNoDelay: true,
        },

        // Optimized query options for failover
        queryOptions: {
          consistency: this.getConsistencyLevel(),
          fetchSize: 100,
          readTimeout: 15000, // Tăng timeout để phù hợp với server 15s
          prepare: true,
          autoPage: false,
          retry: {
            retryPolicy: new cassandra.policies.retry.FallthroughRetryPolicy(),
          },
        },

        // DC-aware policies for better reliability
        policies: {
          retry: new cassandra.policies.retry.RetryPolicy(),
          loadBalancing:
            new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(
              "datacenter1" // Specify datacenter
            ),
          reconnection:
            new cassandra.policies.reconnection.ExponentialReconnectionPolicy(
              2000, // Base delay: 2s (increased)
              60000, // Max delay: 60s (increased)
              2 // Multiplier
            ),
        },

        // Enable metadata synchronization for cluster awareness
        protocolOptions: {
          maxSchemaAgreementWaitSeconds: 10,
          maxVersion: 4, // Use protocol version 4
        },

        // Add cluster metadata options
        metadata: {
          syncIntervalMs: 5000, // Sync cluster metadata every 5s
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

      // Add event listeners for connection monitoring
      this.client.on("hostAdd", (host) => {
        console.log(`✅ New host added: ${host.address}`);
      });

      this.client.on("hostRemove", (host) => {
        console.log(`❌ Host removed: ${host.address}`);
      });

      this.client.on("hostUp", (host) => {
        console.log(`🟢 Host up: ${host.address}`);
      });

      this.client.on("hostDown", (host) => {
        // Only log if it's a localhost connection going down (more critical)
        if (host.address.includes("127.0.0.1")) {
          console.log(`🔴 Critical - Host down: ${host.address}`);
        } else {
          // Internal Docker network hosts going down is less critical for external connections
          console.log(
            `⚠️  Internal host down: ${host.address} (Docker network)`
          );
        }
      });

      // Add connection event listener (safer version)
      this.client.on("connected", (info) => {
        if (info && info.endpoint) {
          console.log(`🔗 Connected to container: ${info.endpoint}`);
        } else {
          console.log(`🔗 Connected to Cassandra container`);
        }
      });

      console.log("🔄 Initiating connection to Cassandra cluster...");
      await this.client.connect();
      this.isConnected = true;

      // Wait for discovery to complete
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased wait time

      const connectedHosts = this.client.getState().getConnectedHosts();
      const allHosts = Array.from(this.client.hosts.values());

      console.log("✅ Connected to Cassandra cluster successfully");
      console.log(
        `📊 Connected hosts: ${connectedHosts.length}/${contactPoints.length}`
      );
      console.log(`📋 Total discovered hosts: ${allHosts.length}`);
      console.log(`🔗 Contact points used: ${contactPoints.join(", ")}`);

      connectedHosts.forEach((host, index) => {
        console.log(
          `   📦 Connected Container ${index + 1}: ${host.address}:${
            host.port
          } (DC: ${host.datacenter}, Rack: ${host.rack})`
        );
      });

      // Log all discovered hosts
      allHosts.forEach((host, index) => {
        const status = host.isUp() ? "🟢 UP" : "🔴 DOWN";
        console.log(
          `   Discovered Host ${index + 1}: ${host.address} ${status} (${
            host.datacenter
          }/${host.rack})`
        );
      });

      // Explanation about discovered hosts
      console.log(`
📝 Host Discovery Explanation:
   • Connected hosts: Your application connects via localhost (127.0.0.1) through Docker port mapping
   • Discovered hosts: Cassandra cluster reports internal Docker network IPs (172.20.x.x)
   • This is normal behavior in Docker environments - external connections use port mapping,
     while internal cluster communication uses Docker network IPs`);

      // Start health monitoring
      this.startHealthCheck();
      console.log("💓 Health monitoring started");

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
    const connectedHosts = this.client.getState().getConnectedHosts();
    if (connectedHosts.length === 0) {
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

    // Stop health checks during reconnection
    this.stopHealthCheck();

    if (this.client) {
      try {
        await this.client.shutdown();
      } catch (error) {
        console.warn("Warning during client shutdown:", error.message);
      }
    }
    this.client = null;
    this.isConnected = false;

    // Add delay before reconnection
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return await this.connect();
  }

  async ensureConnection() {
    try {
      if (!this.client || !this.isConnected) {
        console.log("🔄 No existing connection, creating new one...");
        return await this.connect();
      }

      // Check if client has connected hosts
      const connectedHosts = this.client.getState().getConnectedHosts();
      if (connectedHosts.length === 0) {
        console.log("⚠️ No connected hosts found, attempting reconnection...");
        return await this.reconnect();
      }

      // Test connection with a simple query using ONE consistency
      try {
        await this.client.execute(
          "SELECT release_version FROM system.local",
          [],
          {
            consistency: cassandra.types.consistencies.one,
            timeout: 5000,
          }
        );
        return this.client;
      } catch (testError) {
        console.log(
          `⚠️ Connection test failed: ${testError.message}, attempting reconnection...`
        );
        return await this.reconnect();
      }
    } catch (error) {
      console.error("❌ Failed to ensure connection:", error.message);
      // If all else fails, try one more reconnection
      try {
        console.log("🔄 Making final reconnection attempt...");
        return await this.reconnect();
      } catch (finalError) {
        console.error("❌ Final reconnection failed:", finalError.message);
        throw new Error(
          `Unable to establish database connection: ${finalError.message}`
        );
      }
    }
  }

  // New method for resilient connection attempts with retries
  async connectWithRetries(maxAttempts = 5, delayMs = 5000) {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      try {
        console.log(`🔄 Connection attempt ${attempt}/${maxAttempts}...`);
        return await this.connect();
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to connect after ${maxAttempts} attempts: ${error.message}`
          );
        }

        console.log(`⏳ Waiting ${delayMs / 1000} seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;

        // Increase delay for next attempt (exponential backoff)
        delayMs = Math.min(delayMs * 1.5, 30000);
      }
    }
  }

  async disconnect() {
    console.log("🔄 Shutting down Cassandra connection...");

    // Stop health checks
    this.stopHealthCheck();

    if (this.client) {
      try {
        await this.client.shutdown();
        this.isConnected = false;
        console.log("✅ Disconnected from Cassandra");
      } catch (error) {
        console.error("❌ Error during disconnect:", error.message);
      }
    }
  }
}

// Create singleton instance
const cassandraConnection = new CassandraConnection();

export default cassandraConnection;
