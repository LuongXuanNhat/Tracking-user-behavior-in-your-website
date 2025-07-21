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

      // Giả lập data cho demo (sẽ thay bằng query Cassandra)
      const sampleClickData = [
        {
          element_type: "image",
          element_id: "hero-banner",
          page_url: "/home",
          click_count: 245,
          unique_users: 128,
        },
        {
          element_type: "blog",
          element_id: "blog-post-1",
          page_url: "/blog/web-development",
          click_count: 89,
          unique_users: 67,
        },
        {
          element_type: "review",
          element_id: "review-section",
          page_url: "/services/web-design",
          click_count: 156,
          unique_users: 94,
        },
        {
          element_type: "image",
          element_id: "portfolio-img-1",
          page_url: "/portfolio",
          click_count: 78,
          unique_users: 52,
        },
        {
          element_type: "blog",
          element_id: "blog-post-2",
          page_url: "/blog/seo-tips",
          click_count: 134,
          unique_users: 89,
        },
      ];

      let filteredData = sampleClickData;

      if (element_type) {
        filteredData = filteredData.filter(
          (item) => item.element_type === element_type
        );
      }

      // Tổng hợp theo element_type
      const summary = {};
      filteredData.forEach((item) => {
        if (!summary[item.element_type]) {
          summary[item.element_type] = {
            total_clicks: 0,
            total_unique_users: 0,
            items: [],
          };
        }
        summary[item.element_type].total_clicks += item.click_count;
        summary[item.element_type].total_unique_users += item.unique_users;
        summary[item.element_type].items.push(item);
      });

      res.json({
        status: "success",
        data: {
          summary,
          details: filteredData,
          total_clicks: filteredData.reduce(
            (sum, item) => sum + item.click_count,
            0
          ),
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

      // Giả lập data lượt xem
      const sampleViewData = [
        {
          page_url: "/home",
          view_count: 1250,
          unique_visitors: 890,
          avg_time_on_page: "00:02:35",
          bounce_rate: 0.35,
        },
        {
          page_url: "/services",
          view_count: 678,
          unique_visitors: 456,
          avg_time_on_page: "00:03:45",
          bounce_rate: 0.28,
        },
        {
          page_url: "/blog",
          view_count: 534,
          unique_visitors: 398,
          avg_time_on_page: "00:04:12",
          bounce_rate: 0.22,
        },
        {
          page_url: "/portfolio",
          view_count: 445,
          unique_visitors: 334,
          avg_time_on_page: "00:03:28",
          bounce_rate: 0.31,
        },
        {
          page_url: "/contact",
          view_count: 289,
          unique_visitors: 234,
          avg_time_on_page: "00:01:45",
          bounce_rate: 0.45,
        },
      ];

      let filteredData = sampleViewData;

      if (page_url) {
        filteredData = filteredData.filter((item) =>
          item.page_url.includes(page_url)
        );
      }

      // Sắp xếp theo lượt xem giảm dần
      filteredData.sort((a, b) => b.view_count - a.view_count);

      const totalViews = filteredData.reduce(
        (sum, item) => sum + item.view_count,
        0
      );
      const totalUniqueVisitors = filteredData.reduce(
        (sum, item) => sum + item.unique_visitors,
        0
      );

      res.json({
        status: "success",
        data: {
          pages: filteredData,
          summary: {
            total_views: totalViews,
            total_unique_visitors: totalUniqueVisitors,
            avg_bounce_rate: (
              filteredData.reduce((sum, item) => sum + item.bounce_rate, 0) /
              filteredData.length
            ).toFixed(2),
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
