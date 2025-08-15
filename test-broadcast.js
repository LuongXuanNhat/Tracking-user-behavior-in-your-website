// Test script để kiểm tra broadcast event
import fetch from "node-fetch";

const TEST_WEBSITE_ID = "550e8400-e29b-41d4-a716-446655440000"; // Thay bằng website ID thực tế

async function testBroadcast() {
  try {
    console.log("Testing broadcast to website:", TEST_WEBSITE_ID);

    const response = await fetch(
      "http://localhost:5000/api/tracking/test-broadcast",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId: TEST_WEBSITE_ID,
        }),
      }
    );

    const result = await response.json();
    console.log("Response:", result);

    if (result.success) {
      console.log("✅ Test broadcast sent successfully!");
      console.log("Event ID:", result.data.event.event_id);
    } else {
      console.log("❌ Test broadcast failed:", result.message);
    }
  } catch (error) {
    console.error("❌ Error testing broadcast:", error.message);
  }
}

// Chạy test
testBroadcast();
