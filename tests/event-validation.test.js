// Test file để kiểm tra Event validation và UUID handling
import { Event } from "../backend/app/models/Event.js";
import { v4 as uuidv4 } from "uuid";

// Test UUID validation
console.log("=== Testing Event UUID Validation ===");

try {
  // Test 1: Valid data
  console.log("\n1. Testing valid data:");
  const validEvent = new Event({
    website_id: uuidv4(),
    visitor_id: uuidv4(),
    session_id: uuidv4(),
    event_type: "pageview",
    event_name: "home_page_view",
    page_url: "https://example.com",
  });
  console.log("✅ Valid event created successfully");
  console.log("Event IDs:", {
    event_id: validEvent.event_id,
    website_id: validEvent.website_id,
    visitor_id: validEvent.visitor_id,
    session_id: validEvent.session_id,
  });

  // Test 2: Invalid UUID format
  console.log("\n2. Testing invalid UUID format:");
  try {
    const invalidEvent = new Event({
      website_id: "invalid-uuid",
      visitor_id: uuidv4(),
      session_id: uuidv4(),
      event_type: "click",
    });
    console.log("❌ Should have thrown an error for invalid UUID");
  } catch (error) {
    console.log("✅ Correctly caught invalid UUID:", error.message);
  }

  // Test 3: Missing required fields
  console.log("\n3. Testing missing required fields:");
  try {
    const incompleteEvent = new Event({
      event_type: "pageview",
    });
    console.log("❌ Should have thrown an error for missing fields");
  } catch (error) {
    console.log("✅ Correctly caught missing fields:", error.message);
  }

  // Test 4: Using createSafe method
  console.log("\n4. Testing createSafe method:");
  const safeEvent = Event.createSafe({
    event_type: "click",
    event_name: "button_click",
    page_url: "https://example.com/page",
  });
  console.log("✅ Safe event created with auto-generated UUIDs");
  console.log("Safe Event IDs:", {
    event_id: safeEvent.event_id,
    website_id: safeEvent.website_id,
    visitor_id: safeEvent.visitor_id,
    session_id: safeEvent.session_id,
  });

  // Test 5: Validation before create
  console.log("\n5. Testing validation before create:");
  try {
    safeEvent.validateRequiredFields();
    console.log("✅ Validation passed for safe event");
  } catch (error) {
    console.log("❌ Validation failed:", error.message);
  }
} catch (error) {
  console.error("❌ Test failed:", error);
}

console.log("\n=== Test completed ===");
