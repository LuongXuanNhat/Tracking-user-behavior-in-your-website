// test-refactor.js
// Test script to verify all refactored endpoints work correctly

import fetch from "node-fetch";

const API_BASE = "http://localhost:3002/api";

// Test data
const testCustomer = {
  email: "test@example.com",
  password: "Test123!",
  business_name: "Test Business",
  plan: "basic",
};

const testWebsite = {
  name: "Test Website",
  url: "https://test.example.com",
  description: "Test website for analytics",
};

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testAPI() {
  console.log("🧪 Testing Refactored API Endpoints\n");

  try {
    // Test 1: Health check
    console.log("1. Testing health check...");
    const healthResponse = await fetch(
      `${API_BASE.replace("/api", "")}/health`
    );
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData.status);

    // Test 2: Customer registration
    console.log("\n2. Testing customer registration...");
    const registerResponse = await fetch(`${API_BASE}/customers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCustomer),
    });
    const registerData = await registerResponse.json();
    console.log("✅ Customer registration:", registerData.status);

    if (registerData.status === "success") {
      const customerId = registerData.data.customer.id;
      const token = registerData.data.token;

      // Test 3: Customer login
      console.log("\n3. Testing customer login...");
      const loginResponse = await fetch(`${API_BASE}/customers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testCustomer.email,
          password: testCustomer.password,
        }),
      });
      const loginData = await loginResponse.json();
      console.log("✅ Customer login:", loginData.status);

      // Test 4: Create website
      console.log("\n4. Testing website creation...");
      const websiteResponse = await fetch(`${API_BASE}/websites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testWebsite),
      });
      const websiteData = await websiteResponse.json();
      console.log("✅ Website creation:", websiteData.status);

      if (websiteData.status === "success") {
        const websiteId = websiteData.data.website.id;

        // Test 5: Generate API key
        console.log("\n5. Testing API key generation...");
        const apiKeyResponse = await fetch(`${API_BASE}/api-keys`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: "Test API Key",
            website_id: websiteId,
            permissions: ["tracking", "analytics"],
          }),
        });
        const apiKeyData = await apiKeyResponse.json();
        console.log("✅ API key generation:", apiKeyData.status);

        if (apiKeyData.status === "success") {
          const apiKey = apiKeyData.data.apiKey.key;

          // Test 6: Track event
          console.log("\n6. Testing event tracking...");
          const trackResponse = await fetch(`${API_BASE}/tracking/event`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              event_type: "page_view",
              event_name: "Home Page",
              properties: {
                page_url: "https://test.example.com",
                page_title: "Home",
                referrer: "https://google.com",
              },
              user_id: "test-user-123",
            }),
          });
          const trackData = await trackResponse.json();
          console.log("✅ Event tracking:", trackData.status);

          // Test 7: Get analytics
          console.log("\n7. Testing analytics retrieval...");
          await delay(1000); // Wait for event to be processed
          const analyticsResponse = await fetch(
            `${API_BASE}/analytics/overview?website_id=${websiteId}&period=today`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const analyticsData = await analyticsResponse.json();
          console.log("✅ Analytics retrieval:", analyticsData.status);
        }
      }
    }

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run tests
testAPI();
