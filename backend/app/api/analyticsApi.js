// api/analyticsApi.js
// Logic xử lý API cho analytics

import { TrackingAPI } from "./trackingApi.js";

export class AnalyticsAPI {
  /**
   * Thống kê lượt click theo element type (ảnh, bài đánh giá, bài blog)
   */
  static async getClickAnalytics(req, res) {
    try {
      const { start_date, end_date, element_type } = req.query;

      // Lấy data thật từ tracking events
      const allEvents = TrackingAPI.getAllEvents();
      const clickEvents = allEvents.filter(
        (event) => event.event_type === "click"
      );

      // Lọc theo element_type nếu có
      let filteredEvents = clickEvents;
      if (element_type) {
        filteredEvents = clickEvents.filter(
          (event) => event.element_type === element_type
        );
      }

      // Lọc theo thời gian nếu có
      if (start_date || end_date) {
        filteredEvents = filteredEvents.filter((event) => {
          const eventDate = new Date(event.timestamp);
          const start = start_date
            ? new Date(start_date)
            : new Date("1970-01-01");
          const end = end_date ? new Date(end_date) : new Date();
          return eventDate >= start && eventDate <= end;
        });
      }

      // Tổng hợp data theo element_type và element_id
      const summaryMap = {};
      const detailsMap = {};

      filteredEvents.forEach((event) => {
        const key = `${event.element_type}-${event.element_id || "unknown"}`;

        if (!detailsMap[key]) {
          detailsMap[key] = {
            element_type: event.element_type,
            element_id: event.element_id || "unknown",
            page_url: event.page_url,
            click_count: 0,
            unique_users: new Set(),
          };
        }

        detailsMap[key].click_count++;
        detailsMap[key].unique_users.add(event.user_id);

        // Tổng hợp theo element_type
        if (!summaryMap[event.element_type]) {
          summaryMap[event.element_type] = {
            total_clicks: 0,
            total_unique_users: new Set(),
            items: [],
          };
        }
        summaryMap[event.element_type].total_clicks++;
        summaryMap[event.element_type].total_unique_users.add(event.user_id);
      });

      // Convert Set to count và tạo final data
      const summary = {};
      Object.keys(summaryMap).forEach((elementType) => {
        summary[elementType] = {
          total_clicks: summaryMap[elementType].total_clicks,
          total_unique_users: summaryMap[elementType].total_unique_users.size,
          items: [],
        };
      });

      const details = Object.values(detailsMap).map((item) => ({
        element_type: item.element_type,
        element_id: item.element_id,
        page_url: item.page_url,
        click_count: item.click_count,
        unique_users: item.unique_users.size,
      }));

      // Thêm items vào summary
      details.forEach((detail) => {
        if (summary[detail.element_type]) {
          summary[detail.element_type].items.push(detail);
        }
      });

      res.json({
        status: "success",
        data: {
          summary,
          details,
          total_clicks: filteredEvents.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Thống kê lượt xem trang
   */
  static async getViewAnalytics(req, res) {
    try {
      const { start_date, end_date, page_url } = req.query;

      // Lấy data thật từ tracking events
      const allEvents = TrackingAPI.getAllEvents();
      const viewEvents = allEvents.filter(
        (event) => event.event_type === "view"
      );

      // Lọc theo page_url nếu có
      let filteredEvents = viewEvents;
      if (page_url) {
        filteredEvents = viewEvents.filter((event) =>
          event.page_url.includes(page_url)
        );
      }

      // Lọc theo thời gian nếu có
      if (start_date || end_date) {
        filteredEvents = filteredEvents.filter((event) => {
          const eventDate = new Date(event.timestamp);
          const start = start_date
            ? new Date(start_date)
            : new Date("1970-01-01");
          const end = end_date ? new Date(end_date) : new Date();
          return eventDate >= start && eventDate <= end;
        });
      }

      // Tổng hợp data theo page_url
      const pageMap = {};

      filteredEvents.forEach((event) => {
        if (!pageMap[event.page_url]) {
          pageMap[event.page_url] = {
            page_url: event.page_url,
            view_count: 0,
            unique_visitors: new Set(),
            timestamps: [],
          };
        }

        pageMap[event.page_url].view_count++;
        pageMap[event.page_url].unique_visitors.add(event.user_id);
        pageMap[event.page_url].timestamps.push(new Date(event.timestamp));
      });

      // Convert to final format
      const pages = Object.values(pageMap).map((page) => ({
        page_url: page.page_url,
        view_count: page.view_count,
        unique_visitors: page.unique_visitors.size,
        // Tính avg_time_on_page và bounce_rate có thể phức tạp hơn
        // Hiện tại để placeholder
        avg_time_on_page: "00:02:30",
        bounce_rate: Math.random() * 0.5, // Random 0-50%
      }));

      // Sắp xếp theo lượt xem giảm dần
      pages.sort((a, b) => b.view_count - a.view_count);

      const totalViews = pages.reduce((sum, page) => sum + page.view_count, 0);
      const totalUniqueVisitors = pages.reduce(
        (sum, page) => sum + page.unique_visitors,
        0
      );

      res.json({
        status: "success",
        data: {
          pages,
          summary: {
            total_views: totalViews,
            total_unique_visitors: totalUniqueVisitors,
            avg_bounce_rate:
              pages.length > 0
                ? (
                    pages.reduce((sum, page) => sum + page.bounce_rate, 0) /
                    pages.length
                  ).toFixed(2)
                : "0.00",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Phân tích dịch vụ nào phổ biến nhất / ít dùng nhất
   */
  static async getPopularServices(req, res) {
    try {
      const { period = "7d" } = req.query; // 7d, 30d, 90d

      // Giả lập data phân tích dịch vụ
      const serviceAnalytics = [
        {
          service_name: "Web Development",
          service_id: "web-dev",
          interactions: {
            views: 1250,
            clicks: 340,
            inquiries: 45,
            conversions: 12,
          },
          popularity_score: 92,
          trend: "increasing",
        },
        {
          service_name: "SEO Optimization",
          service_id: "seo",
          interactions: {
            views: 890,
            clicks: 245,
            inquiries: 32,
            conversions: 8,
          },
          popularity_score: 78,
          trend: "stable",
        },
        {
          service_name: "Mobile App Development",
          service_id: "mobile-app",
          interactions: {
            views: 567,
            clicks: 189,
            inquiries: 28,
            conversions: 6,
          },
          popularity_score: 65,
          trend: "increasing",
        },
        {
          service_name: "UI/UX Design",
          service_id: "ui-ux",
          interactions: {
            views: 445,
            clicks: 156,
            inquiries: 22,
            conversions: 5,
          },
          popularity_score: 58,
          trend: "stable",
        },
        {
          service_name: "E-commerce Solutions",
          service_id: "ecommerce",
          interactions: {
            views: 298,
            clicks: 89,
            inquiries: 12,
            conversions: 2,
          },
          popularity_score: 38,
          trend: "decreasing",
        },
        {
          service_name: "Digital Marketing",
          service_id: "digital-marketing",
          interactions: {
            views: 234,
            clicks: 67,
            inquiries: 8,
            conversions: 1,
          },
          popularity_score: 29,
          trend: "decreasing",
        },
      ];

      // Sắp xếp theo popularity score
      serviceAnalytics.sort((a, b) => b.popularity_score - a.popularity_score);

      const mostPopular = serviceAnalytics.slice(0, 3);
      const leastPopular = serviceAnalytics.slice(-3).reverse();

      // Tính conversion rate cho mỗi service
      const servicesWithConversionRate = serviceAnalytics.map((service) => ({
        ...service,
        conversion_rate: (
          (service.interactions.conversions / service.interactions.views) *
          100
        ).toFixed(2),
        click_through_rate: (
          (service.interactions.clicks / service.interactions.views) *
          100
        ).toFixed(2),
      }));

      res.json({
        status: "success",
        data: {
          period,
          most_popular: mostPopular,
          least_popular: leastPopular,
          all_services: servicesWithConversionRate,
          insights: {
            total_services_analyzed: serviceAnalytics.length,
            avg_popularity_score: (
              serviceAnalytics.reduce((sum, s) => sum + s.popularity_score, 0) /
              serviceAnalytics.length
            ).toFixed(1),
            trending_up: serviceAnalytics.filter(
              (s) => s.trend === "increasing"
            ).length,
            trending_down: serviceAnalytics.filter(
              (s) => s.trend === "decreasing"
            ).length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Tổng hợp dashboard chính
   */
  static async getDashboard(req, res) {
    try {
      const { period = "7d" } = req.query;

      const dashboardData = {
        overview: {
          total_events: 15420,
          unique_users: 3248,
          total_pageviews: 8945,
          avg_session_duration: "00:04:32",
        },
        top_events: [
          { event_type: "click", count: 6240, percentage: 40.4 },
          { event_type: "view", count: 4890, percentage: 31.7 },
          { event_type: "scroll", count: 2850, percentage: 18.5 },
          { event_type: "hover", count: 1440, percentage: 9.3 },
        ],
        top_elements: [
          { element_type: "image", interactions: 3456, unique_users: 1234 },
          { element_type: "blog", interactions: 2890, unique_users: 987 },
          { element_type: "review", interactions: 2340, unique_users: 856 },
          { element_type: "service", interactions: 1890, unique_users: 678 },
        ],
        hourly_activity: this.generateHourlyActivity(),
        real_time: {
          active_users: 23,
          current_pageviews: 45,
          events_last_minute: 12,
        },
      };

      res.json({
        status: "success",
        data: dashboardData,
        period,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Helper function để generate hourly activity data
  static generateHourlyActivity() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push({
        hour: i,
        events: Math.floor(Math.random() * 200) + 50,
        users: Math.floor(Math.random() * 50) + 10,
      });
    }
    return hours;
  }
}
