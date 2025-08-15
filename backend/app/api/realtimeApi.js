// api/realtimeApi.js
// API endpoints cho realtime events - tối ưu cho Cassandra

import { Event } from "../models/Event.js";

/**
 * Lấy events realtime theo website với pagination
 * Tận dụng điểm mạnh của Cassandra về đọc dữ liệu
 * GET /api/realtime/events/:websiteId
 */
export async function getRealtimeEvents(req, res) {
  try {
    const { websiteId } = req.params;
    const {
      page = 1,
      limit = 20,
      pageToken, // Token cho pagination trong Cassandra
    } = req.query;

    // Validate websiteId
    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "websiteId là bắt buộc",
      });
    }

    // Tối ưu query cho Cassandra - lấy events mới nhất theo time
    // Sử dụng event_date làm partition key và event_time làm clustering key
    const events = await Event.findRealtimeByWebsite(websiteId, {
      limit: parseInt(limit),
      pageToken: pageToken,
    });

    // Tính toán pagination info
    const totalEvents = events.length;
    const hasMore = totalEvents === parseInt(limit);
    const nextPageToken =
      hasMore && events.length > 0
        ? events[events.length - 1].event_time
        : null;

    res.json({
      success: true,
      data: {
        events: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalEvents: totalEvents,
          hasMore: hasMore,
          nextPageToken: nextPageToken,
        },
      },
    });
  } catch (error) {
    console.error("Get realtime events error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy events realtime theo date range
 * Tối ưu cho Cassandra query pattern
 * GET /api/realtime/events/:websiteId/range
 */
export async function getRealtimeEventsByDateRange(req, res) {
  try {
    const { websiteId } = req.params;
    const { startDate, endDate, limit = 50, pageToken } = req.query;

    // Validate inputs
    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "websiteId là bắt buộc",
      });
    }

    // Set default dates if not provided
    const start = startDate || new Date().toISOString().split("T")[0];
    const end = endDate || start;

    // Query events by date range - tối ưu cho Cassandra
    const events = await Event.findByWebsiteAndDateRange(
      websiteId,
      start,
      end,
      {
        limit: parseInt(limit),
        pageToken: pageToken,
      }
    );

    const hasMore = events.length === parseInt(limit);
    const nextPageToken =
      hasMore && events.length > 0
        ? events[events.length - 1].event_time
        : null;

    res.json({
      success: true,
      data: {
        events: events,
        dateRange: {
          startDate: start,
          endDate: end,
        },
        pagination: {
          limit: parseInt(limit),
          totalEvents: events.length,
          hasMore: hasMore,
          nextPageToken: nextPageToken,
        },
      },
    });
  } catch (error) {
    console.error("Get realtime events by date range error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Stream events realtime - chỉ trả về events trong vài phút gần nhất
 * Tối ưu cho realtime display
 * GET /api/realtime/events/:websiteId/stream
 */
export async function streamRealtimeEvents(req, res) {
  try {
    const { websiteId } = req.params;
    const {
      minutes = 5, // Lấy events trong 5 phút gần nhất
      limit = 100,
    } = req.query;

    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "websiteId là bắt buộc",
      });
    }

    // Tính thời gian bắt đầu (vài phút gần nhất)
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(minutes) * 60 * 1000);

    // Query recent events - tối ưu cho Cassandra
    const events = await Event.findRecentByWebsite(websiteId, startTime, {
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        events: events,
        timeRange: {
          startTime: startTime,
          endTime: now,
          minutes: parseInt(minutes),
        },
        totalEvents: events.length,
      },
    });
  } catch (error) {
    console.error("Stream realtime events error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
