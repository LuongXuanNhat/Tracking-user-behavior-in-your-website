// api/trackingApi.js
// Logic xử lý API cho tracking

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class TrackingAPI {
  /**
   * Ghi nhận sự kiện đơn lẻ
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.user_id - ID của user thực hiện event
   * @param {string} req.body.event_type - Loại event (click, view, scroll, hover, load)
   * @param {string} req.body.element_type - Loại phần tử (image, blog, review, service, button, link, video)
   * @param {string} req.body.page_url - URL của trang web nơi event xảy ra
   * @param {string} [req.body.element_id] - ID của phần tử được tương tác (optional)
   * @param {Object} [req.body.metadata={}] - Thông tin bổ sung về event (optional)
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa thông tin event đã được ghi nhận
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

      // Create event and save to Cassandra
      const client = cassandraConnection.getClient();
      const eventId = uuidv4();
      const timestamp = new Date();
      const createdDate = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Save to events_by_date table
      const eventsQuery = `
        INSERT INTO user_logs.events_by_date (
          created_date, timestamp, id, user_id, event_type, 
          element_type, element_id, page_url, ip_address, user_agent, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await client.execute(
        eventsQuery,
        [
          createdDate,
          timestamp,
          eventId,
          user_id,
          event_type,
          element_type,
          element_id || null,
          page_url,
          req.ip || null,
          req.get("User-Agent") || null,
          JSON.stringify(metadata),
        ],
        { prepare: true }
      );

      // Save to user_events table
      const userEventsQuery = `
        INSERT INTO user_logs.user_events (
          user_id, timestamp, id, event_type, element_type,
          element_id, page_url, ip_address, user_agent, metadata, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await client.execute(
        userEventsQuery,
        [
          user_id,
          timestamp,
          eventId,
          event_type,
          element_type,
          element_id || null,
          page_url,
          req.ip || null,
          req.get("User-Agent") || null,
          JSON.stringify(metadata),
          createdDate,
        ],
        { prepare: true }
      );

      res.status(201).json({
        status: "success",
        message: "Event tracked successfully",
        data: {
          event_id: eventId,
          timestamp: timestamp,
          user_id: user_id,
          event_type: event_type,
          element_type: element_type,
          page_url: page_url,
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
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array<Object>} req.body.events - Mảng các event cần ghi nhận
   * @param {string} req.body.events[].user_id - ID của user thực hiện event
   * @param {string} req.body.events[].event_type - Loại event (click, view, scroll, hover, load)
   * @param {string} req.body.events[].element_type - Loại phần tử (image, blog, review, service, button, link, video)
   * @param {string} req.body.events[].page_url - URL của trang web nơi event xảy ra
   * @param {string} [req.body.events[].element_id] - ID của phần tử được tương tác (optional)
   * @param {Object} [req.body.events[].metadata={}] - Thông tin bổ sung về event (optional)
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa thông tin về các events đã được xử lý và lỗi nếu có
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

      const client = cassandraConnection.getClient();
      const processedEvents = [];
      const errors = [];

      // Process each event
      for (let index = 0; index < events.length; index++) {
        const event = events[index];

        try {
          const {
            user_id,
            event_type,
            element_type,
            page_url,
            element_id,
            metadata = {},
          } = event;

          // Validate required fields
          if (!user_id || !event_type || !element_type || !page_url) {
            errors.push({
              index,
              message:
                "Missing required fields: user_id, event_type, element_type, page_url",
            });
            continue;
          }

          // Validate event_type
          const validEventTypes = ["click", "view", "scroll", "hover", "load"];
          if (!validEventTypes.includes(event_type)) {
            errors.push({
              index,
              message:
                "Invalid event_type. Must be one of: " +
                validEventTypes.join(", "),
            });
            continue;
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
            errors.push({
              index,
              message:
                "Invalid element_type. Must be one of: " +
                validElementTypes.join(", "),
            });
            continue;
          }

          // Create event and save to Cassandra
          const eventId = uuidv4();
          const timestamp = new Date();
          const createdDate = timestamp.toISOString().split("T")[0];

          // Save to events_by_date table
          const eventsQuery = `
            INSERT INTO user_logs.events_by_date (
              created_date, timestamp, id, user_id, event_type, 
              element_type, element_id, page_url, ip_address, user_agent, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await client.execute(
            eventsQuery,
            [
              createdDate,
              timestamp,
              eventId,
              user_id,
              event_type,
              element_type,
              element_id || null,
              page_url,
              req.ip || null,
              req.get("User-Agent") || null,
              JSON.stringify(metadata),
            ],
            { prepare: true }
          );

          // Save to user_events table
          const userEventsQuery = `
            INSERT INTO user_logs.user_events (
              user_id, timestamp, id, event_type, element_type,
              element_id, page_url, ip_address, user_agent, metadata, created_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await client.execute(
            userEventsQuery,
            [
              user_id,
              timestamp,
              eventId,
              event_type,
              element_type,
              element_id || null,
              page_url,
              req.ip || null,
              req.get("User-Agent") || null,
              JSON.stringify(metadata),
              createdDate,
            ],
            { prepare: true }
          );

          processedEvents.push({
            event_id: eventId,
            timestamp: timestamp,
            user_id: user_id,
            event_type: event_type,
            element_type: element_type,
          });
        } catch (error) {
          errors.push({
            index,
            message: error.message,
          });
        }
      }

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
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.date] - Ngày để filter (format: YYYY-MM-DD)
   * @param {string} [req.query.user_id] - ID của user để filter
   * @param {string} [req.query.event_type] - Loại event để filter
   * @param {string} [req.query.element_type] - Loại phần tử để filter
   * @param {string} [req.query.page_url] - URL trang web để filter
   * @param {number} [req.query.limit=50] - Số lượng kết quả tối đa
   * @param {number} [req.query.offset=0] - Vị trí bắt đầu lấy kết quả
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa danh sách events đã được filter
   */
  static async getEvents(req, res) {
    try {
      const {
        date,
        user_id,
        event_type,
        element_type,
        page_url,
        limit = 50,
        offset = 0,
      } = req.query;

      const client = cassandraConnection.getClient();
      let query,
        params = [];

      if (date) {
        // Query from events_by_date table if date is provided
        query = `
          SELECT created_date, timestamp, id, user_id, event_type, 
                 element_type, element_id, page_url, ip_address, user_agent, metadata
          FROM user_logs.events_by_date 
          WHERE created_date = ?
        `;
        params.push(date);
      } else if (user_id) {
        // Query from user_events table if user_id is provided
        query = `
          SELECT user_id, timestamp, id, event_type, element_type,
                 element_id, page_url, ip_address, user_agent, metadata, created_date
          FROM user_logs.user_events 
          WHERE user_id = ?
        `;
        params.push(user_id);
      } else {
        return res.status(400).json({
          status: "error",
          message:
            "Either 'date' (YYYY-MM-DD) or 'user_id' parameter is required",
        });
      }

      // Add additional filters
      if (event_type) {
        query += ` AND event_type = ?`;
        params.push(event_type);
      }

      if (element_type) {
        query += ` AND element_type = ?`;
        params.push(element_type);
      }

      // Add ALLOW FILTERING if we have additional filters
      if (event_type || element_type) {
        query += ` ALLOW FILTERING`;
      }

      // Add ordering and limit
      query += ` ORDER BY timestamp DESC`;
      if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit));
      }

      const result = await client.execute(query, params, { prepare: true });
      let events = result.rows;

      // Apply additional client-side filtering for page_url if needed
      if (page_url) {
        events = events.filter(
          (event) => event.page_url && event.page_url.includes(page_url)
        );
      }

      // Apply pagination for client-side filtered results
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedEvents = events.slice(startIndex, endIndex);

      // Format events for response
      const formattedEvents = paginatedEvents.map((event) => ({
        id: event.id,
        user_id: event.user_id,
        event_type: event.event_type,
        element_type: event.element_type,
        element_id: event.element_id,
        page_url: event.page_url,
        timestamp: event.timestamp,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata ? JSON.parse(event.metadata) : {},
        created_date: event.created_date,
      }));

      res.json({
        status: "success",
        data: {
          events: formattedEvents,
          total: events.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          filters: {
            date,
            user_id,
            event_type,
            element_type,
            page_url,
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
   * Lấy events của một user cụ thể
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.user_id - ID của user cần lấy events
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.start_date] - Ngày bắt đầu filter (ISO format)
   * @param {string} [req.query.end_date] - Ngày kết thúc filter (ISO format)
   * @param {string} [req.query.event_type] - Loại event để filter
   * @param {number} [req.query.limit=100] - Số lượng kết quả tối đa
   * @param {Object} res - Express response object
   * @returns {Object} JSON response chứa danh sách events của user
   */
  static async getUserEvents(req, res) {
    try {
      const { user_id } = req.params;
      const { start_date, end_date, event_type, limit = 100 } = req.query;

      if (!user_id) {
        return res.status(400).json({
          status: "error",
          message: "user_id is required",
        });
      }

      const client = cassandraConnection.getClient();
      let query = `
        SELECT user_id, timestamp, id, event_type, element_type,
               element_id, page_url, ip_address, user_agent, metadata, created_date
        FROM user_logs.user_events 
        WHERE user_id = ?
      `;
      const params = [user_id];

      // Add date filtering if provided
      if (start_date) {
        query += ` AND timestamp >= ?`;
        params.push(new Date(start_date));
      }
      if (end_date) {
        query += ` AND timestamp <= ?`;
        params.push(new Date(end_date));
      }

      // Add event type filtering
      if (event_type) {
        query += ` AND event_type = ?`;
        params.push(event_type);
      }

      // Add filtering clause if needed
      if (start_date || end_date || event_type) {
        query += ` ALLOW FILTERING`;
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(parseInt(limit));

      const result = await client.execute(query, params, { prepare: true });

      const formattedEvents = result.rows.map((event) => ({
        id: event.id,
        user_id: event.user_id,
        event_type: event.event_type,
        element_type: event.element_type,
        element_id: event.element_id,
        page_url: event.page_url,
        timestamp: event.timestamp,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata ? JSON.parse(event.metadata) : {},
        created_date: event.created_date,
      }));

      res.json({
        status: "success",
        data: {
          user_id,
          events: formattedEvents,
          total: formattedEvents.length,
          filters: {
            start_date,
            end_date,
            event_type,
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
   * Lấy tất cả events để analytics sử dụng (từ Cassandra)
   * @param {Object} [filters={}] - Các điều kiện filter
   * @param {string} [filters.start_date] - Ngày bắt đầu filter (YYYY-MM-DD)
   * @param {string} [filters.end_date] - Ngày kết thúc filter (YYYY-MM-DD)
   * @param {string} [filters.event_type] - Loại event để filter
   * @returns {Promise<Array>} Mảng chứa tất cả events thỏa mãn điều kiện filter
   */
  static async getAllEventsFromCassandra(filters = {}) {
    try {
      const client = cassandraConnection.getClient();
      const { start_date, end_date, event_type } = filters;

      let query = `
        SELECT created_date, timestamp, id, user_id, event_type, 
               element_type, element_id, page_url, ip_address, user_agent, metadata
        FROM user_logs.events_by_date
      `;
      const params = [];

      // Add date filtering if provided
      if (start_date) {
        query += ` WHERE created_date >= ?`;
        params.push(start_date);

        if (end_date) {
          query += ` AND created_date <= ?`;
          params.push(end_date);
        }
      } else if (end_date) {
        query += ` WHERE created_date <= ?`;
        params.push(end_date);
      }

      // Add event type filtering
      if (event_type) {
        if (params.length > 0) {
          query += ` AND event_type = ?`;
        } else {
          query += ` WHERE event_type = ?`;
        }
        params.push(event_type);
      }

      // Add ALLOW FILTERING if we have filters
      if (params.length > 0) {
        query += ` ALLOW FILTERING`;
      }

      const result = await client.execute(query, params, { prepare: true });

      return result.rows.map((event) => ({
        id: event.id,
        user_id: event.user_id,
        event_type: event.event_type,
        element_type: event.element_type,
        element_id: event.element_id,
        page_url: event.page_url,
        timestamp: event.timestamp,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata ? JSON.parse(event.metadata) : {},
        created_date: event.created_date,
      }));
    } catch (error) {
      console.error("Error fetching events from Cassandra:", error);
      return [];
    }
  }
}
