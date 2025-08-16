// api/trackingApi.js
// API endpoints cho thu thập events (tracking)

import { Event } from "../models/Event.js";
import socketService from "../services/socketService.js";
import { v4 as uuidv4 } from "uuid";

/**
 * NGHIỆP VỤ 2: THU THẬP EVENT (TRACKING)
 */

/**
 * Thu thập event từ website
 * POST /api/tracking/events
 */
export async function collectEvent(req, res) {
  try {
    // Lấy thông tin website từ req.website (đã được add từ authen)
    const website = req.website;
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website không tồn tại",
      });
    }

    const {
      event_type,
      event_name,
      page_url,
      page_title,
      element_selector,
      element_text,
      visitor_id,
      session_id,
      user_id, // có thể null cho anonymous users
      device_type,
      browser,
      os,
      country,
      city,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      duration_since_start,
      properties = {},
    } = req.body;

    // Validation - theo Event model requirements
    if (!event_type) {
      return res.status(400).json({
        success: false,
        message: "event_type là bắt buộc",
      });
    }

    if (!page_url) {
      return res.status(400).json({
        success: false,
        message: "page_url là bắt buộc",
      });
    }

    // if (!visitor_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "visitor_id là bắt buộc",
    //   });
    // }

    // if (!session_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "session_id là bắt buộc",
    //   });
    // }

    // Lấy IP address
    const ip_address =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

    // Tạo event data theo đúng schema của Event model
    const eventData = {
      website_id: website.website_id, // Sử dụng website.website_id từ req.website
      visitor_id: visitor_id || uuidv4(), // Required field - đã validate
      user_id: user_id || null, // null cho anonymous users
      session_id: session_id, // Required field - đã validate
      event_type: event_type, // Required field - đã validate
      event_name: event_name || event_type,
      page_url: page_url, // Required field - đã validate
      page_title: page_title,
      element_selector: element_selector,
      element_text: element_text,
      device_type: device_type,
      browser: browser,
      os: os,
      ip_address: ip_address,
      country: country,
      city: city,
      referrer: referrer,
      utm_source: utm_source,
      utm_medium: utm_medium,
      utm_campaign: utm_campaign,
      duration_since_start: duration_since_start,
      properties: properties,
    };

    // Tạo event mới bằng createSafe để có validation
    const event = Event.createSafe(eventData);

    // Lưu event vào database
    await event.create();

    // Broadcast event realtime to subscribed users và owner website
    if (socketService.isInitialized()) {
      await socketService.broadcastNewEvent(
        website.website_id.toString(),
        event
      );
      console.log(
        `✅ Event ${event.event_id} broadcast completed for website ${website.website_id}`
      );
    } else {
      console.warn(
        `⚠️  Socket.IO not initialized - Event ${event.event_id} not broadcasted for website ${website.website_id}`
      );
    }

    // Cập nhật hoạt động cuối của website nếu có method này
    // if (website.updateLastActivity) {
    //   await website.updateLastActivity();
    // }

    res.status(201).json({
      success: true,
      message: "Event đã được ghi nhận",
      data: {
        event_id: event.event_id,
        website_id: event.website_id,
        visitor_id: event.visitor_id,
        user_id: event.user_id,
        session_id: event.session_id,
        event_type: event.event_type,
        event_time: event.event_time,
      },
    });
  } catch (error) {
    console.error("Collect event error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Thu thập nhiều events cùng lúc (batch)
 * POST /api/tracking/events/batch
 */
export async function collectBatchEvents(req, res) {
  try {
    // Lấy thông tin website từ req.website (đã được add từ authen)
    const website = req.website;
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website không tồn tại",
      });
    }

    const { events } = req.body;
    console.log("Received events:", req.body);

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "events array là bắt buộc và không được rỗng",
      });
    }

    // Lấy IP address
    const ip_address =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

    // Validate và tạo events
    const createdEvents = [];
    const failedEvents = [];

    for (let i = 0; i < events.length; i++) {
      const eventData = events[i];

      const {
        event_type,
        event_name,
        page_url,
        page_title,
        element_selector,
        element_text,
        visitor_id,
        session_id,
        user_id, // có thể null cho anonymous users
        device_type,
        browser,
        os,
        country,
        city,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        duration_since_start,
        properties = {},
      } = eventData;

      // Validation - theo Event model requirements
      if (!event_type) {
        failedEvents.push({ index: i, reason: "event_type là bắt buộc" });
        continue;
      }

      if (!page_url) {
        failedEvents.push({ index: i, reason: "page_url là bắt buộc" });
        continue;
      }

      // Tạo event data theo đúng schema của Event model
      const eventPayload = {
        website_id: website.website_id, // Sử dụng website.website_id từ req.website
        visitor_id: visitor_id || uuidv4(), // Required field
        user_id: user_id || null, // null cho anonymous users
        session_id: session_id || uuidv4(), // Required field
        event_type: event_type, // Required field
        event_name: event_name || event_type,
        page_url: page_url, // Required field
        page_title: page_title,
        element_selector: element_selector,
        element_text: element_text,
        device_type: device_type,
        browser: browser,
        os: os,
        ip_address: ip_address,
        country: country,
        city: city,
        referrer: referrer,
        utm_source: utm_source,
        utm_medium: utm_medium,
        utm_campaign: utm_campaign,
        duration_since_start: duration_since_start,
        properties: properties,
      };

      try {
        // Tạo event mới bằng createSafe để có validation
        const event = Event.createSafe(eventPayload);

        // Lưu event vào database
        await event.create();

        // Broadcast event realtime to subscribed users và owner website
        if (socketService.isInitialized()) {
          await socketService.broadcastNewEvent(
            website.website_id.toString(),
            event
          );
        } else {
          console.warn(
            `⚠️  Socket.IO not initialized - Batch event ${event.event_id} not broadcasted for website ${website.website_id}`
          );
        }

        createdEvents.push({
          event_id: event.event_id,
          website_id: event.website_id,
          visitor_id: event.visitor_id,
          user_id: event.user_id,
          session_id: event.session_id,
          event_type: event.event_type,
          event_time: event.event_time,
        });
      } catch (error) {
        console.error("Error creating batch event:", error);
        failedEvents.push({ index: i, reason: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdEvents.length}/${events.length} events đã được ghi nhận`,
      data: {
        created_count: createdEvents.length,
        total_count: events.length,
        failed_count: failedEvents.length,
        created_events: createdEvents,
        failed_events: failedEvents.length > 0 ? failedEvents : undefined,
      },
    });
  } catch (error) {
    console.error("Collect batch events error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy events theo user ID
 * GET /api/tracking/events/user/:userId
 */
export async function getEventsByUser(req, res) {
  try {
    const { userId } = req.params;
    const {
      startDate = new Date().toISOString().split("T")[0],
      endDate,
      limit = 100,
    } = req.query;

    const events = await Event.findByUserId(
      userId,
      startDate,
      endDate,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: events.map((event) => event.toJSON()),
    });
  } catch (error) {
    console.error("Get events by user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy events theo session ID
 * GET /api/tracking/events/session/:sessionId
 */
export async function getEventsBySession(req, res) {
  try {
    const { sessionId } = req.params;
    const {
      startDate = new Date().toISOString().split("T")[0],
      endDate,
      limit = 100,
    } = req.query;

    const events = await Event.findBySessionId(
      sessionId,
      startDate,
      endDate,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: events.map((event) => event.toJSON()),
    });
  } catch (error) {
    console.error("Get events by session error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy events theo khoảng thời gian
 * GET /api/tracking/events
 */
export async function getEventsByDateRange(req, res) {
  try {
    const {
      startDate = new Date().toISOString().split("T")[0],
      endDate,
      eventType,
      limit = 100,
    } = req.query;

    let events;

    if (eventType) {
      events = await Event.findByEventType(
        eventType,
        startDate,
        endDate,
        parseInt(limit)
      );
    } else {
      events = await Event.findByDateRange(startDate, endDate, parseInt(limit));
    }

    res.json({
      success: true,
      data: events.map((event) => event.toJSON()),
    });
  } catch (error) {
    console.error("Get events by date range error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Thống kê events theo ngày
 * GET /api/tracking/stats/daily/:date
 */
export async function getDailyEventStats(req, res) {
  try {
    const { date } = req.params;

    const stats = await Event.getDailyStats(date);

    res.json({
      success: true,
      data: {
        date,
        stats,
      },
    });
  } catch (error) {
    console.error("Get daily event stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy top pages
 * GET /api/tracking/stats/top-pages
 */
export async function getTopPages(req, res) {
  try {
    const {
      startDate = new Date().toISOString().split("T")[0],
      endDate,
      limit = 10,
    } = req.query;

    const topPages = await Event.getTopPages(
      startDate,
      endDate,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topPages,
    });
  } catch (error) {
    console.error("Get top pages error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Health check cho tracking
 * GET /api/tracking/health
 */
export async function trackingHealthCheck(req, res) {
  try {
    res.json({
      success: true,
      message: "Tracking service is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Tracking service is unhealthy",
      error: error.message,
    });
  }
}

/**
 * Test endpoint để broadcast event test
 * POST /api/tracking/test-broadcast
 */
export async function testBroadcast(req, res) {
  try {
    const { websiteId } = req.body;

    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "websiteId là bắt buộc",
      });
    }

    // Tạo một test event
    const testEvent = {
      event_id: uuidv4(),
      event_type: "test",
      event_name: "Test Event",
      page_url: "https://test.example.com/test",
      page_title: "Test Page",
      visitor_id: uuidv4(),
      session_id: uuidv4(),
      user_id: null,
      event_time: new Date(),
      device_type: "desktop",
      browser: "Chrome",
      os: "Windows",
      country: "VN",
      city: "Ho Chi Minh",
      properties: { test: true },
    };

    // Broadcast test event
    if (socketService.isInitialized()) {
      await socketService.broadcastNewEvent(websiteId.toString(), testEvent);
    } else {
      console.warn(`⚠️  Socket.IO not initialized for test broadcast`);
    }

    res.json({
      success: true,
      message: "Test event broadcasted",
      data: {
        websiteId: websiteId,
        event: testEvent,
      },
    });
  } catch (error) {
    console.error("Test broadcast error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
