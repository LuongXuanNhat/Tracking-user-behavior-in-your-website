// backend/app/helpers/dbResilience.js
// Database resilience helper for handling connection failures and retries
import cassandraConnection from "../../config/database/init.js";

class DatabaseResilience {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Execute a query with automatic retry and connection recovery
   * @param {string} query - CQL query to execute
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options (consistency, timeout, etc.)
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Query result
   */
  async executeWithRetry(
    query,
    params = [],
    options = {},
    maxRetries = this.maxRetries
  ) {
    let lastError;

    // Set default options for resilience
    const defaultOptions = {
      consistency: cassandraConnection.getConsistencyLevel(),
      timeout: 10000,
      prepare: true,
      ...options,
    };

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Ensure we have a healthy connection
        const client = await cassandraConnection.ensureConnection();

        // Execute the query
        const result = await client.execute(query, params, defaultOptions);

        // Log successful recovery if this wasn't the first attempt
        if (attempt > 1) {
          console.log(
            `✅ Query recovered on attempt ${attempt}: ${query.substring(
              0,
              50
            )}...`
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        console.log(`❌ Query attempt ${attempt} failed: ${error.message}`);
        console.log(`🔍 Query: ${query.substring(0, 100)}...`);

        // Don't retry if this is the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Check if it's a connection-related error
        if (this.isConnectionError(error)) {
          console.log(`🔄 Connection error detected, forcing reconnection...`);
          try {
            await cassandraConnection.reconnect();
          } catch (reconnectError) {
            console.log(`⚠️ Reconnection failed: ${reconnectError.message}`);
          }
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    console.error(
      `❌ Query failed after ${maxRetries + 1} attempts: ${lastError.message}`
    );
    throw new Error(
      `Database operation failed after ${maxRetries + 1} attempts: ${
        lastError.message
      }`
    );
  }

  /**
   * Execute a batch of queries with retry logic
   * @param {Array} queries - Array of {query, params} objects
   * @param {Object} options - Batch options
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Batch result
   */
  async executeBatchWithRetry(
    queries,
    options = {},
    maxRetries = this.maxRetries
  ) {
    const defaultOptions = {
      consistency: cassandraConnection.getConsistencyLevel(),
      prepare: true,
      ...options,
    };

    return this.executeWithRetry(
      null, // No single query
      [],
      defaultOptions,
      maxRetries,
      async (client) => {
        return await client.batch(queries, defaultOptions);
      }
    );
  }

  /**
   * Check if an error is connection-related
   * @param {Error} error - The error to check
   * @returns {boolean} True if connection-related
   */
  isConnectionError(error) {
    const connectionErrorKeywords = [
      "connect",
      "connection",
      "timeout",
      "unreachable",
      "refused",
      "disconnected",
      "unavailable",
      "host",
      "socket",
      "network",
    ];

    const errorMessage = error.message.toLowerCase();
    return connectionErrorKeywords.some((keyword) =>
      errorMessage.includes(keyword)
    );
  }

  /**
   * Execute a custom operation with retry logic
   * @param {Function} operation - Function that takes a client and returns a Promise
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Operation result
   */
  async executeOperationWithRetry(operation, maxRetries = this.maxRetries) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Ensure we have a healthy connection
        const client = await cassandraConnection.ensureConnection();

        // Execute the custom operation
        const result = await operation(client);

        // Log successful recovery if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`✅ Operation recovered on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        console.log(`❌ Operation attempt ${attempt} failed: ${error.message}`);

        // Don't retry if this is the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Check if it's a connection-related error
        if (this.isConnectionError(error)) {
          console.log(`🔄 Connection error detected, forcing reconnection...`);
          try {
            await cassandraConnection.reconnect();
          } catch (reconnectError) {
            console.log(`⚠️ Reconnection failed: ${reconnectError.message}`);
          }
        }

        // Wait before retry
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    console.error(
      `❌ Operation failed after ${maxRetries + 1} attempts: ${
        lastError.message
      }`
    );
    throw new Error(
      `Database operation failed after ${maxRetries + 1} attempts: ${
        lastError.message
      }`
    );
  }

  /**
   * Health check with automatic recovery
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const client = await cassandraConnection.ensureConnection();
      const connectedHosts = client.getState().getConnectedHosts();

      // Test with a simple query
      await client.execute("SELECT release_version FROM system.local", [], {
        consistency: cassandraConnection.getConsistencyLevel(),
        timeout: 5000,
      });

      return {
        healthy: true,
        connectedHosts: connectedHosts.length,
        message: `Connected to ${connectedHosts.length} host(s)`,
      };
    } catch (error) {
      return {
        healthy: false,
        connectedHosts: 0,
        message: `Health check failed: ${error.message}`,
      };
    }
  }
}

// Create singleton instance
const dbResilience = new DatabaseResilience();

export default dbResilience;
