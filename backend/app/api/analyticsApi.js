// api/analyticsApi.js
// API endpoints cho analytics và báo cáo

import { Event } from "../models/Event.js";
import { Website } from "../models/Website.js";
import { ApiKey } from "../models/ApiKey.js";

/**
 * NGHIỆP VỤ 3: XEM DASHBOARD REAL-TIME
 * NGHIỆP VỤ 4: XEM BÁO CÁO LỊCH SỬ
 * NGHIỆP VỤ 5: PHÂN TÍCH USER JOURNEY
 */

/**
 * Dashboard real-time cho website
 * GET /api/analytics/realtime/:websiteId
 */
export async function getRealtimeAnalytics(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { websiteId } = req.params;

    // Kiểm tra quyền truy cập website
    const website = await Website.findById(websiteId);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Lấy events trong 1 giờ qua
    const recentEvents = await Event.findByDateRange(oneHourAgo, today, 1000);

    // Filter events thuộc website này
    const websiteEvents = recentEvents.filter(
      (event) => event.metadata && event.metadata.website_id === websiteId
    );

    // Tính toán metrics real-time
    const currentTime = now.getTime();
    const oneHourAgoTime = currentTime - 60 * 60 * 1000;
    const fiveMinutesAgoTime = currentTime - 5 * 60 * 1000;

    const activeEvents = websiteEvents.filter(
      (event) => new Date(event.timestamp).getTime() > fiveMinutesAgoTime
    );

    // Unique sessions trong 5 phút qua
    const activeSessions = new Set(
      activeEvents.map((event) => event.session_id)
    );

    // Page views trong 1 giờ qua
    const pageViews = websiteEvents.filter(
      (event) => event.event_type === "page_view"
    );

    // Top pages trong 1 giờ qua
    const pageStats = {};
    pageViews.forEach((event) => {
      pageStats[event.page_url] = (pageStats[event.page_url] || 0) + 1;
    });

    const topPages = Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page_url, count]) => ({ page_url, count }));

    // Event types trong 1 giờ qua
    const eventTypeStats = {};
    websiteEvents.forEach((event) => {
      eventTypeStats[event.event_type] =
        (eventTypeStats[event.event_type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        realtime: {
          active_users: activeSessions.size,
          total_events_1h: websiteEvents.length,
          page_views_1h: pageViews.length,
          last_updated: now.toISOString(),
        },
        top_pages: topPages,
        event_types: eventTypeStats,
        recent_events: activeEvents.slice(0, 20).map((event) => event.toJSON()),
      },
    });
  } catch (error) {
    console.error("Get realtime analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Báo cáo lịch sử cho website
 * GET /api/analytics/reports/:websiteId
 */
export async function getHistoricalReports(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { websiteId } = req.params;
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate = new Date().toISOString().split("T")[0],
      groupBy = "day",
    } = req.query;

    // Kiểm tra quyền truy cập website
    const website = await Website.findById(websiteId);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Lấy tất cả events trong khoảng thời gian
    const events = await Event.findByDateRange(startDate, endDate, 10000);

    // Filter events thuộc website này
    const websiteEvents = events.filter(
      (event) => event.metadata && event.metadata.website_id === websiteId
    );

    // Group by date/hour
    const groupedData = {};
    const dateFormat = groupBy === "hour" ? "YYYY-MM-DD HH" : "YYYY-MM-DD";

    websiteEvents.forEach((event) => {
      const date = new Date(event.timestamp);
      let key;
      if (groupBy === "hour") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")} ${String(
          date.getHours()
        ).padStart(2, "0")}`;
      } else {
        key = event.created_date;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          total_events: 0,
          page_views: 0,
          unique_users: new Set(),
          unique_sessions: new Set(),
          event_types: {},
        };
      }

      groupedData[key].total_events++;
      if (event.event_type === "page_view") {
        groupedData[key].page_views++;
      }
      groupedData[key].unique_users.add(event.user_id);
      groupedData[key].unique_sessions.add(event.session_id);
      groupedData[key].event_types[event.event_type] =
        (groupedData[key].event_types[event.event_type] || 0) + 1;
    });

    // Convert sets to counts and sort by date
    const chartData = Object.values(groupedData)
      .map((item) => ({
        date: item.date,
        total_events: item.total_events,
        page_views: item.page_views,
        unique_users: item.unique_users.size,
        unique_sessions: item.unique_sessions.size,
        event_types: item.event_types,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Tính tổng kết
    const totalStats = {
      total_events: websiteEvents.length,
      total_page_views: websiteEvents.filter(
        (e) => e.event_type === "page_view"
      ).length,
      unique_users: new Set(websiteEvents.map((e) => e.user_id)).size,
      unique_sessions: new Set(websiteEvents.map((e) => e.session_id)).size,
    };

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: totalStats,
        chart_data: chartData,
      },
    });
  } catch (error) {
    console.error("Get historical reports error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * User journey analysis
 * GET /api/analytics/user-journey/:userId
 */
export async function getUserJourney(req, res) {
  try {
    const { userId } = req.params;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate = new Date().toISOString().split("T")[0],
    } = req.query;

    // Lấy tất cả events của user trong khoảng thời gian
    const userEvents = await Event.findByUserId(
      userId,
      startDate,
      endDate,
      1000
    );

    // Group by session
    const sessionGroups = {};
    userEvents.forEach((event) => {
      if (!sessionGroups[event.session_id]) {
        sessionGroups[event.session_id] = [];
      }
      sessionGroups[event.session_id].push(event);
    });

    // Sort events trong mỗi session theo thời gian
    Object.keys(sessionGroups).forEach((sessionId) => {
      sessionGroups[sessionId].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    // Tạo user journey timeline
    const sessions = Object.entries(sessionGroups)
      .map(([sessionId, events]) => {
        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];
        const duration =
          new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp);

        // Page flow trong session
        const pageFlow = events
          .filter((e) => e.event_type === "page_view")
          .map((e) => ({
            page_url: e.page_url,
            timestamp: e.timestamp,
            time_on_page: null, // Sẽ tính sau
          }));

        // Tính time on page
        for (let i = 0; i < pageFlow.length - 1; i++) {
          const currentTime = new Date(pageFlow[i].timestamp);
          const nextTime = new Date(pageFlow[i + 1].timestamp);
          pageFlow[i].time_on_page = Math.round(
            (nextTime - currentTime) / 1000
          ); // seconds
        }

        return {
          session_id: sessionId,
          start_time: firstEvent.timestamp,
          end_time: lastEvent.timestamp,
          duration_seconds: Math.round(duration / 1000),
          total_events: events.length,
          page_views: events.filter((e) => e.event_type === "page_view").length,
          clicks: events.filter((e) => e.event_type === "click").length,
          page_flow: pageFlow,
          all_events: events.map((e) => e.toJSON()),
        };
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // User summary
    const userSummary = {
      user_id: userId,
      total_sessions: sessions.length,
      total_events: userEvents.length,
      total_duration: sessions.reduce((sum, s) => sum + s.duration_seconds, 0),
      first_seen: sessions.length > 0 ? sessions[0].start_time : null,
      last_seen:
        sessions.length > 0 ? sessions[sessions.length - 1].end_time : null,
      unique_pages: new Set(
        userEvents
          .filter((e) => e.event_type === "page_view")
          .map((e) => e.page_url)
      ).size,
    };

    res.json({
      success: true,
      data: {
        user_summary: userSummary,
        sessions: sessions,
      },
    });
  } catch (error) {
    console.error("Get user journey error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Page performance analytics
 * GET /api/analytics/pages/:websiteId
 */
export async function getPageAnalytics(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { websiteId } = req.params;
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate = new Date().toISOString().split("T")[0],
    } = req.query;

    // Kiểm tra quyền truy cập website
    const website = await Website.findById(websiteId);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Lấy events trong khoảng thời gian
    const events = await Event.findByDateRange(startDate, endDate, 10000);

    // Filter events thuộc website này
    const websiteEvents = events.filter(
      (event) => event.metadata && event.metadata.website_id === websiteId
    );

    // Group by page
    const pageStats = {};

    websiteEvents.forEach((event) => {
      if (event.event_type === "page_view") {
        if (!pageStats[event.page_url]) {
          pageStats[event.page_url] = {
            page_url: event.page_url,
            views: 0,
            unique_users: new Set(),
            sessions: new Set(),
            total_time: 0,
            bounce_sessions: new Set(),
          };
        }

        pageStats[event.page_url].views++;
        pageStats[event.page_url].unique_users.add(event.user_id);
        pageStats[event.page_url].sessions.add(event.session_id);
      }
    });

    // Tính bounce rate (sessions chỉ có 1 page view)
    const sessionPageCounts = {};
    websiteEvents
      .filter((e) => e.event_type === "page_view")
      .forEach((event) => {
        if (!sessionPageCounts[event.session_id]) {
          sessionPageCounts[event.session_id] = new Set();
        }
        sessionPageCounts[event.session_id].add(event.page_url);
      });

    // Convert to final format
    const pageAnalytics = Object.values(pageStats)
      .map((page) => {
        const bounces = Array.from(page.sessions).filter(
          (sessionId) =>
            sessionPageCounts[sessionId] &&
            sessionPageCounts[sessionId].size === 1
        ).length;

        return {
          page_url: page.page_url,
          views: page.views,
          unique_users: page.unique_users.size,
          sessions: page.sessions.size,
          bounce_rate:
            page.sessions.size > 0
              ? ((bounces / page.sessions.size) * 100).toFixed(2)
              : 0,
        };
      })
      .sort((a, b) => b.views - a.views);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        pages: pageAnalytics,
      },
    });
  } catch (error) {
    console.error("Get page analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Event type analytics
 * GET /api/analytics/events/:websiteId
 */
export async function getEventAnalytics(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { websiteId } = req.params;
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate = new Date().toISOString().split("T")[0],
    } = req.query;

    // Kiểm tra quyền truy cập website
    const website = await Website.findById(websiteId);
    if (!website || website.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Lấy events trong khoảng thời gian
    const events = await Event.findByDateRange(startDate, endDate, 10000);

    // Filter events thuộc website này
    const websiteEvents = events.filter(
      (event) => event.metadata && event.metadata.website_id === websiteId
    );

    // Group by event type
    const eventTypeStats = {};

    websiteEvents.forEach((event) => {
      if (!eventTypeStats[event.event_type]) {
        eventTypeStats[event.event_type] = {
          event_type: event.event_type,
          count: 0,
          unique_users: new Set(),
          unique_sessions: new Set(),
        };
      }

      eventTypeStats[event.event_type].count++;
      eventTypeStats[event.event_type].unique_users.add(event.user_id);
      eventTypeStats[event.event_type].unique_sessions.add(event.session_id);
    });

    // Convert to final format
    const eventAnalytics = Object.values(eventTypeStats)
      .map((stat) => ({
        event_type: stat.event_type,
        count: stat.count,
        unique_users: stat.unique_users.size,
        unique_sessions: stat.unique_sessions.size,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        event_types: eventAnalytics,
      },
    });
  } catch (error) {
    console.error("Get event analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
