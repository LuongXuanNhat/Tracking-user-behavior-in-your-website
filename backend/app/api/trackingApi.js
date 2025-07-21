// api/trackingApi.js
// Logic xử lý API cho tracking

// In-memory storage for demo (thực tế sẽ dùng Cassandra)
let userEvents = [];
let eventCounter = 1;

export class TrackingAPI {
  /**
   * Ghi nhận sự kiện đơn lẻ
   */
  static async createEvent(req, res) {
    try {
      const {
        user_id,
        event_type,
        element_type,
        page_url,
        element_id,
        metadata = {},
      } = req.body;

      // Validate required fields
      if (!user_id || !event_type || !element_type || !page_url) {
        return res.status(400).json({
          status: "error",
          message:
            "Missing required fields: user_id, event_type, element_type, page_url",
        });
      }

      // Validate event_type
      const validEventTypes = ["click", "view", "scroll", "hover", "load"];
      if (!validEventTypes.includes(event_type)) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid event_type. Must be one of: " + validEventTypes.join(", "),
        });
      }

      // Validate element_type
      const validElementTypes = [
        "image",
        "blog",
        "review",
        "service",
        "button",
        "link",
        "video",
      ];
      if (!validElementTypes.includes(element_type)) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid element_type. Must be one of: " +
            validElementTypes.join(", "),
        });
      }

      const newEvent = {
        id: eventCounter++,
        user_id,
        event_type,
        element_type,
        page_url,
        element_id,
        timestamp: new Date().toISOString(),
        metadata,
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      };

      userEvents.push(newEvent);

      res.status(201).json({
        status: "success",
        message: "Event tracked successfully",
        data: {
          event_id: newEvent.id,
          timestamp: newEvent.timestamp,
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
   * Ghi nhận nhiều sự kiện cùng lúc
   */
  static async createBatchEvents(req, res) {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Events array is required and must not be empty",
        });
      }

      const processedEvents = [];
      const errors = [];

      events.forEach((event, index) => {
        try {
          const {
            user_id,
            event_type,
            element_type,
            page_url,
            element_id,
            metadata = {},
          } = event;

          if (!user_id || !event_type || !element_type || !page_url) {
            errors.push({
              index,
              message: "Missing required fields",
            });
            return;
          }

          const newEvent = {
            id: eventCounter++,
            user_id,
            event_type,
            element_type,
            page_url,
            element_id,
            timestamp: new Date().toISOString(),
            metadata,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
          };

          userEvents.push(newEvent);
          processedEvents.push({
            event_id: newEvent.id,
            timestamp: newEvent.timestamp,
          });
        } catch (error) {
          errors.push({
            index,
            message: error.message,
          });
        }
      });

      res.status(201).json({
        status: "success",
        message: `Processed ${processedEvents.length} events`,
        data: {
          processed: processedEvents,
          errors: errors,
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
   * Lấy danh sách các events với filter
   */
  static async getEvents(req, res) {
    try {
      const {
        user_id,
        event_type,
        element_type,
        page_url,
        limit = 50,
        offset = 0,
      } = req.query;

      let filteredEvents = [...userEvents];

      // Apply filters
      if (user_id) {
        filteredEvents = filteredEvents.filter(
          (event) => event.user_id === user_id
        );
      }

      if (event_type) {
        filteredEvents = filteredEvents.filter(
          (event) => event.event_type === event_type
        );
      }

      if (element_type) {
        filteredEvents = filteredEvents.filter(
          (event) => event.element_type === element_type
        );
      }

      if (page_url) {
        filteredEvents = filteredEvents.filter((event) =>
          event.page_url.includes(page_url)
        );
      }

      // Sort by timestamp desc
      filteredEvents.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

      res.json({
        status: "success",
        data: {
          events: paginatedEvents,
          total: filteredEvents.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
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
   * Lấy tất cả events để analytics sử dụng
   */
  static getAllEvents() {
    return userEvents;
  }
}
