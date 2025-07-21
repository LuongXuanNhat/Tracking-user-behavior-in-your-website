// tests/demo.test.js
// Simple demo test file for User Behavior Tracking API

const BASE_URL = "http://localhost:3001/api";

// Test data
const testEvent = {
  user_id: "test_user_123",
  event_type: "click",
  element_type: "image",
  page_url: "https://example.com/test",
  element_id: "test-image-1",
  metadata: {
    test: true,
    timestamp: new Date().toISOString(),
  },
};

const testBatchEvents = {
  events: [
    {
      user_id: "test_user_123",
      event_type: "click",
      element_type: "blog",
      page_url: "https://example.com/blog",
      element_id: "blog-post-1",
    },
    {
      user_id: "test_user_123",
      event_type: "view",
      element_type: "service",
      page_url: "https://example.com/services",
      element_id: "web-development",
    },
  ],
};

// Helper function to make API calls
async function apiCall(endpoint, method = "GET", data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`${method} ${endpoint}:`, response.status);
    console.log("Response:", result);
    console.log("---");

    return { status: response.status, data: result };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return { status: "error", error: error.message };
  }
}

// Test functions
async function testHealthCheck() {
  console.log("🔍 Testing Health Check...");
  await apiCall("/health");
}

async function testTrackingEvent() {
  console.log("📊 Testing Single Event Tracking...");
  await apiCall("/tracking/event", "POST", testEvent);
}

async function testBatchTracking() {
  console.log("📊 Testing Batch Event Tracking...");
  await apiCall("/tracking/batch", "POST", testBatchEvents);
}

async function testGetEvents() {
  console.log("📋 Testing Get Events...");
  await apiCall("/tracking/events?limit=5");
}

async function testAnalytics() {
  console.log("📈 Testing Analytics...");

  // Test click analytics
  console.log("🖱️ Click Analytics:");
  await apiCall("/analytics/clicks");

  // Test view analytics
  console.log("👁️ View Analytics:");
  await apiCall("/analytics/views");

  // Test popular services
  console.log("⭐ Popular Services:");
  await apiCall("/analytics/popular-services");

  // Test dashboard
  console.log("📊 Dashboard:");
  await apiCall("/analytics/dashboard");
}

async function testUsers() {
  console.log("👥 Testing User endpoints...");

  // Get users
  await apiCall("/users");

  // Create user
  await apiCall("/users", "POST", {
    name: "Test User",
    email: "test@example.com",
  });

  // Get users again
  await apiCall("/users");
}

// Main test function
async function runTests() {
  console.log("🚀 Starting API Tests...\n");

  try {
    await testHealthCheck();
    await testUsers();
    await testTrackingEvent();
    await testBatchTracking();
    await testGetEvents();
    await testAnalytics();

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runTests,
    testHealthCheck,
    testTrackingEvent,
    testBatchTracking,
    testGetEvents,
    testAnalytics,
    testUsers,
  };
}

// Auto-run if executed directly in browser
if (typeof window !== "undefined") {
  window.runAPITests = runTests;
  console.log(
    "API Test functions loaded. Call runAPITests() to start testing."
  );
}

// Auto-run if executed in Node.js
if (typeof require !== "undefined" && require.main === module) {
  runTests();
}
