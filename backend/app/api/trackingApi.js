// api/trackingApi.js
// API endpoints cho thu thập events (tracking)

import { Event } from "../models/Event.js";
import { ApiKey } from "../models/ApiKey.js";
import { Website } from "../models/Website.js";
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
    const apiKeyHeader =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!apiKeyHeader) {
      return res.status(401).json({
        success: false,
        message: "API key là bắt buộc",
      });
    }

    // Xác thực API key
    const validation = await ApiKey.validateApiKey(apiKeyHeader);
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: validation.reason,
      });
    }

    const apiKey = validation.apiKey;

    // Lấy thông tin website
    const website = await Website.findById(apiKey.website_id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website không tồn tại",
      });
    }

    const {
      event_type,
      element_type,
      page_url,
      element_id,
      metadata = {},
      user_agent,
      session_id,
    } = req.body;

    // Validation
    if (!event_type || !page_url) {
      return res.status(400).json({
        success: false,
        message: "event_type và page_url là bắt buộc",
      });
    }

    // Tạo user_id nếu chưa có (dựa trên session hoặc tạo mới)
    let user_id = req.body.user_id;
    if (!user_id) {
      user_id = uuidv4(); // Tạo user_id mới cho anonymous user
    }

    // Lấy IP address
    const ip_address =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

    // Tạo event mới
    const event = new Event({
      user_id,
      event_type,
      element_type,
      page_url,
      element_id,
      metadata: {
        ...metadata,
        website_id: website.id,
        api_key: apiKeyHeader,
      },
      ip_address,
      user_agent: user_agent || req.headers["user-agent"],
      session_id: session_id || uuidv4(),
    });

    await event.create();

    // Cập nhật hoạt động cuối của website
    await website.updateLastActivity();

    res.status(201).json({
      success: true,
      message: "Event đã được ghi nhận",
      data: {
        event_id: event.id,
        user_id: event.user_id,
        timestamp: event.timestamp,
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
    const apiKeyHeader =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!apiKeyHeader) {
      return res.status(401).json({
        success: false,
        message: "API key là bắt buộc",
      });
    }

    // Xác thực API key
    const validation = await ApiKey.validateApiKey(apiKeyHeader);
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: validation.reason,
      });
    }

    const apiKey = validation.apiKey;

    // Lấy thông tin website
    const website = await Website.findById(apiKey.website_id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website không tồn tại",
      });
    }

    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "events array là bắt buộc và không được rỗng",
      });
    }

    // Validate và tạo events
    const createdEvents = [];
    const ip_address =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

    for (const eventData of events) {
      const {
        event_type,
        element_type,
        page_url,
        element_id,
        metadata = {},
        user_agent,
        session_id,
      } = eventData;

      // Validation
      if (!event_type || !page_url) {
        continue; // Skip invalid events
      }

      // Tạo user_id nếu chưa có
      let user_id = eventData.user_id;
      if (!user_id) {
        user_id = uuidv4();
      }

      const event = new Event({
        user_id,
        event_type,
        element_type,
        page_url,
        element_id,
        metadata: {
          ...metadata,
          website_id: website.id,
          api_key: apiKeyHeader,
        },
        ip_address,
        user_agent: user_agent || req.headers["user-agent"],
        session_id: session_id || uuidv4(),
      });

      try {
        await event.create();
        createdEvents.push(event.id);
      } catch (error) {
        console.error("Error creating batch event:", error);
        // Continue với events khác
      }
    }

    // Cập nhật hoạt động cuối của website
    await website.updateLastActivity();

    res.status(201).json({
      success: true,
      message: `${createdEvents.length}/${events.length} events đã được ghi nhận`,
      data: {
        created_count: createdEvents.length,
        total_count: events.length,
        event_ids: createdEvents,
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
