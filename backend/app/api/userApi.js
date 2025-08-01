// api/userApi.js
// API endpoints cho quản lý users/visitors

import { User } from "../models/User.js";
import { Event } from "../models/Event.js";

/**
 * NGHIỆP VỤ 5: PHÂN TÍCH USER JOURNEY - USER MANAGEMENT
 */

/**
 * Tạo user mới
 * POST /api/users
 */
export async function createUser(req, res) {
  try {
    const { name, email } = req.body;

    // Validation
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "Ít nhất một trong name hoặc email là bắt buộc",
      });
    }

    // Kiểm tra email đã tồn tại
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email đã được sử dụng",
          data: existingUser.toJSON(),
        });
      }
    }

    const user = new User({ name, email });
    await user.create();

    res.status(201).json({
      success: true,
      message: "Tạo user thành công",
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy danh sách users
 * GET /api/users
 */
export async function getUsers(req, res) {
  try {
    const { limit = 100 } = req.query;

    const users = await User.findAll(parseInt(limit));

    res.json({
      success: true,
      data: users.map((user) => user.toJSON()),
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy thông tin user theo ID
 * GET /api/users/:id
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy user theo email
 * GET /api/users/by-email/:email
 */
export async function getUserByEmail(req, res) {
  try {
    const { email } = req.params;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user với email này",
      });
    }

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Get user by email error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Cập nhật user
 * PUT /api/users/:id
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    // Kiểm tra email mới đã tồn tại
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email đã được sử dụng",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    await user.update(updateData);

    res.json({
      success: true,
      message: "Cập nhật user thành công",
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Xóa user
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    await user.delete();

    res.json({
      success: true,
      message: "Xóa user thành công",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy hoạt động của user (events)
 * GET /api/users/:id/activities
 */
export async function getUserActivities(req, res) {
  try {
    const { id } = req.params;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate = new Date().toISOString().split("T")[0],
      limit = 100,
    } = req.query;

    // Kiểm tra user tồn tại
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    // Lấy events của user
    const events = await Event.findByUserId(
      id,
      startDate,
      endDate,
      parseInt(limit)
    );

    // Group by date để tạo timeline
    const activityTimeline = {};
    events.forEach((event) => {
      const date = event.created_date;
      if (!activityTimeline[date]) {
        activityTimeline[date] = {
          date,
          events: [],
          summary: {
            total_events: 0,
            page_views: 0,
            clicks: 0,
            unique_sessions: new Set(),
          },
        };
      }

      activityTimeline[date].events.push(event.toJSON());
      activityTimeline[date].summary.total_events++;

      if (event.event_type === "page_view") {
        activityTimeline[date].summary.page_views++;
      } else if (event.event_type === "click") {
        activityTimeline[date].summary.clicks++;
      }

      activityTimeline[date].summary.unique_sessions.add(event.session_id);
    });

    // Convert sets to counts và sort by date
    const timeline = Object.values(activityTimeline)
      .map((day) => ({
        ...day,
        summary: {
          ...day.summary,
          unique_sessions: day.summary.unique_sessions.size,
        },
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Tính tổng kết
    const totalStats = {
      total_events: events.length,
      unique_sessions: new Set(events.map((e) => e.session_id)).size,
      unique_pages: new Set(
        events
          .filter((e) => e.event_type === "page_view")
          .map((e) => e.page_url)
      ).size,
      date_range: { startDate, endDate },
    };

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        total_stats: totalStats,
        timeline,
      },
    });
  } catch (error) {
    console.error("Get user activities error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy thống kê tổng quan của user
 * GET /api/users/:id/stats
 */
export async function getUserStats(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra user tồn tại
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    // Lấy events trong 30 ngày qua
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const events = await Event.findByUserId(id, thirtyDaysAgo, today, 10000);

    // Tính các metrics
    const stats = {
      total_events: events.length,
      total_sessions: new Set(events.map((e) => e.session_id)).size,
      total_page_views: events.filter((e) => e.event_type === "page_view")
        .length,
      total_clicks: events.filter((e) => e.event_type === "click").length,
      unique_pages_visited: new Set(
        events
          .filter((e) => e.event_type === "page_view")
          .map((e) => e.page_url)
      ).size,
      first_seen:
        events.length > 0 ? events[events.length - 1].timestamp : null,
      last_seen: events.length > 0 ? events[0].timestamp : null,
      avg_session_duration: 0,
    };

    // Tính average session duration
    const sessionGroups = {};
    events.forEach((event) => {
      if (!sessionGroups[event.session_id]) {
        sessionGroups[event.session_id] = [];
      }
      sessionGroups[event.session_id].push(event);
    });

    let totalDuration = 0;
    let sessionCount = 0;

    Object.values(sessionGroups).forEach((sessionEvents) => {
      if (sessionEvents.length > 1) {
        sessionEvents.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        const duration =
          new Date(sessionEvents[sessionEvents.length - 1].timestamp) -
          new Date(sessionEvents[0].timestamp);
        totalDuration += duration;
        sessionCount++;
      }
    });

    if (sessionCount > 0) {
      stats.avg_session_duration = Math.round(
        totalDuration / sessionCount / 1000
      ); // seconds
    }

    // Top pages
    const pageStats = {};
    events
      .filter((e) => e.event_type === "page_view")
      .forEach((event) => {
        pageStats[event.page_url] = (pageStats[event.page_url] || 0) + 1;
      });

    const topPages = Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page_url, visits]) => ({ page_url, visits }));

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        stats,
        top_pages: topPages,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
