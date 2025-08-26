/* eslint-disable no-undef */
// test-resilience.js
// Script to test Cassandra cluster resilience and recovery
import cassandraConnection from "./backend/config/database/init.js";
import dotenv from "dotenv";

dotenv.config();

class ResilienceTest {
  constructor() {
    this.testInterval = null;
    this.testCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  async testConnection() {
    try {
      const client = await cassandraConnection.ensureConnection();

      // Test with a simple query
      const result = await client.execute(
        "SELECT release_version FROM system.local",
        [],
        {
          consistency: cassandraConnection.getConsistencyLevel(),
          timeout: 5000,
        }
      );

      this.testCount++;
      this.successCount++;

      const connectedHosts = client.getState().getConnectedHosts();
      console.log(
        `✅ Test ${this.testCount}: SUCCESS - ${connectedHosts.length} hosts connected, Version: ${result.rows[0].release_version}`
      );

      return {
        success: true,
        hosts: connectedHosts.length,
        version: result.rows[0].release_version,
      };
    } catch (error) {
      this.testCount++;
      this.failureCount++;
      console.log(`❌ Test ${this.testCount}: FAILED - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  startContinuousTest(intervalMs = 5000) {
    console.log(
      `🔄 Starting continuous resilience test (every ${intervalMs / 1000}s)...`
    );
    console.log(
      "💡 You can stop nodes with: docker stop cassandra_node1 cassandra_node2"
    );
    console.log(
      "💡 And start them with: docker start cassandra_node1 cassandra_node2"
    );
    console.log("📊 Press Ctrl+C to stop the test\n");

    this.testInterval = setInterval(async () => {
      await this.testConnection();

      if (this.testCount % 10 === 0) {
        console.log(`\n📊 Summary after ${this.testCount} tests:`);
        console.log(
          `   ✅ Successes: ${this.successCount} (${(
            (this.successCount / this.testCount) *
            100
          ).toFixed(1)}%)`
        );
        console.log(
          `   ❌ Failures: ${this.failureCount} (${(
            (this.failureCount / this.testCount) *
            100
          ).toFixed(1)}%)`
        );
        console.log(
          `   🔄 Current Success Rate: ${(
            (this.successCount / this.testCount) *
            100
          ).toFixed(1)}%\n`
        );
      }
    }, intervalMs);
  }

  stopTest() {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    console.log(`\n🏁 Test completed after ${this.testCount} attempts:`);
    console.log(`   ✅ Total Successes: ${this.successCount}`);
    console.log(`   ❌ Total Failures: ${this.failureCount}`);
    console.log(
      `   🎯 Final Success Rate: ${(
        (this.successCount / this.testCount) *
        100
      ).toFixed(1)}%`
    );
  }

  async runSingleTest() {
    console.log("🔄 Running single connection test...");
    const result = await this.testConnection();
    console.log("\n📊 Test Result:", result);
    return result;
  }

  async runManualResilienceTest() {
    console.log("🧪 Starting manual resilience test...");
    console.log(
      "This will test the system's ability to recover from node failures\n"
    );

    console.log("Phase 1: Testing with all nodes up");
    await this.runSingleTest();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("\nPhase 2: Simulating heavy load");
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(this.testConnection());
    }
    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.success).length;
    console.log(`✅ Handled ${successful}/10 concurrent requests successfully`);

    console.log("\n✅ Manual resilience test completed");
    console.log(
      "💡 To test node failure resilience, run the continuous test and manually stop/start Docker containers"
    );
  }
}

async function main() {
  const test = new ResilienceTest();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🔄 Stopping resilience test...");
    test.stopTest();
    await cassandraConnection.disconnect();
    process.exit(0);
  });

  try {
    // Connect first
    console.log("🔄 Initializing connection...");
    await cassandraConnection.connectWithRetries(5, 3000);
    console.log("✅ Initial connection established\n");

    // Check command line arguments
    const args = process.argv.slice(2);

    if (args.includes("--continuous")) {
      const interval = args.includes("--fast") ? 2000 : 5000;
      test.startContinuousTest(interval);
    } else if (args.includes("--single")) {
      await test.runSingleTest();
      await cassandraConnection.disconnect();
      process.exit(0);
    } else {
      await test.runManualResilienceTest();
      await cassandraConnection.disconnect();
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Failed to start resilience test:", error);
    process.exit(1);
  }
}

// Usage information
if (process.argv.includes("--help")) {
  console.log(`
🧪 Cassandra Resilience Test Tool

Usage:
  node test-resilience.js                 # Run manual resilience test
  node test-resilience.js --single        # Run single connection test
  node test-resilience.js --continuous    # Run continuous test (5s interval)
  node test-resilience.js --continuous --fast  # Run continuous test (2s interval)
  node test-resilience.js --help          # Show this help

During continuous test:
  - Stop nodes: docker stop cassandra_node1 cassandra_node2
  - Start nodes: docker start cassandra_node1 cassandra_node2
  - Press Ctrl+C to stop the test
`);
  process.exit(0);
}

main();
