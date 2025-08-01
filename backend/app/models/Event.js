// models/Event.js
// Model để quản lý user events với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class Event {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.user_id = data.user_id;
    this.created_date = data.created_date || this.formatDate(new Date());
    this.timestamp = data.timestamp || new Date();
    this.event_type = data.event_type;
    this.element_type = data.element_type;
    this.page_url = data.page_url;
    this.element_id = data.element_id;
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.session_id = data.session_id;

    // Initialize metadata properly
    if (data.metadata) {
      if (data.metadata instanceof Map) {
        this.metadata = Object.fromEntries(data.metadata);
      } else if (
        typeof data.metadata === "object" &&
        !Array.isArray(data.metadata)
      ) {
        this.metadata = data.metadata;
      } else {
        this.metadata = {};
      }
    } else {
      this.metadata = {};
    }
  }

  /**
   * Format date cho partition key
   */
  formatDate(date) {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Tạo event mới - lưu vào cả 2 bảng để optimize queries
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();

      // Lưu vào user_events table (partitioned by user_id)
      const userEventsQuery = `
        INSERT INTO user_logs.user_events (
          user_id, created_date, timestamp, id, event_type, element_type,
          page_url, element_id, metadata, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Lưu vào events_by_date table (partitioned by date)
      const eventsByDateQuery = `
        INSERT INTO user_logs.events_by_date (
          created_date, timestamp, id, user_id, event_type, element_type,
          page_url, element_id, metadata, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const metadataMap = new Map(Object.entries(this.metadata));

      const params = [
        this.user_id,
        this.created_date,
        this.timestamp,
        this.id,
        this.event_type,
        this.element_type,
        this.page_url,
        this.element_id,
        metadataMap,
        this.ip_address,
        this.user_agent,
        this.session_id,
      ];

      const paramsForDate = [
        this.created_date,
        this.timestamp,
        this.id,
        this.user_id,
        this.event_type,
        this.element_type,
        this.page_url,
        this.element_id,
        metadataMap,
        this.ip_address,
        this.user_agent,
        this.session_id,
      ];

      // Execute both queries in parallel
      await Promise.all([
        client.execute(userEventsQuery, params, { prepare: true }),
        client.execute(eventsByDateQuery, paramsForDate, { prepare: true }),
      ]);

      return this;
    } catch (error) {
      console.error("Failed to save event to Cassandra:", error);
      throw new Error(`Failed to save event: ${error.message}`);
    }
  }

  /**
   * Tìm events theo user ID trong khoảng thời gian
   */
  static async findByUserId(userId, startDate, endDate = null, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      let query, params;

      if (startDate === endDate) {
        // Single day query
        query = `
          SELECT * FROM user_logs.user_events 
          WHERE user_id = ? AND created_date = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `;
        params = [userId, startDate, limit];
      } else {
        // Multiple days - need to query each day separately
        const dates = this.generateDateRange(startDate, endDate);
        const queries = dates.map((date) => ({
          query: `
            SELECT * FROM user_logs.user_events 
            WHERE user_id = ? AND created_date = ?
            ORDER BY timestamp DESC
          `,
          params: [userId, date],
        }));

        const results = await Promise.all(
          queries.map((q) =>
            client.execute(q.query, q.params, { prepare: true })
          )
        );

        const allRows = results.flatMap((result) => result.rows);
        allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return allRows.slice(0, limit).map((row) => new Event(row));
      }

      const result = await client.execute(query, params, { prepare: true });
      return result.rows.map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by user id:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo date range
   */
  static async findByDateRange(startDate, endDate = null, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      if (startDate === endDate) {
        // Single day query
        const query = `
          SELECT * FROM user_logs.events_by_date 
          WHERE created_date = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `;
        const result = await client.execute(query, [startDate, limit], {
          prepare: true,
        });
        return result.rows.map((row) => new Event(row));
      } else {
        // Multiple days
        const dates = this.generateDateRange(startDate, endDate);
        const queries = dates.map((date) => ({
          query: `
            SELECT * FROM user_logs.events_by_date 
            WHERE created_date = ?
            ORDER BY timestamp DESC
          `,
          params: [date],
        }));

        const results = await Promise.all(
          queries.map((q) =>
            client.execute(q.query, q.params, { prepare: true })
          )
        );

        const allRows = results.flatMap((result) => result.rows);
        allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return allRows.slice(0, limit).map((row) => new Event(row));
      }
    } catch (error) {
      console.error("Error finding events by date range:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo session ID
   */
  static async findBySessionId(
    sessionId,
    startDate,
    endDate = null,
    limit = 100
  ) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      const queries = dates.map((date) => ({
        query: `
          SELECT * FROM user_logs.events_by_date 
          WHERE created_date = ? AND session_id = ?
          ORDER BY timestamp DESC
          ALLOW FILTERING
        `,
        params: [date, sessionId],
      }));

      const results = await Promise.all(
        queries.map((q) => client.execute(q.query, q.params, { prepare: true }))
      );

      const allRows = results.flatMap((result) => result.rows);
      allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allRows.slice(0, limit).map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by session id:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo event type
   */
  static async findByEventType(
    eventType,
    startDate,
    endDate = null,
    limit = 100
  ) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      const queries = dates.map((date) => ({
        query: `
          SELECT * FROM user_logs.events_by_date 
          WHERE created_date = ? AND event_type = ?
          ORDER BY timestamp DESC
          ALLOW FILTERING
        `,
        params: [date, eventType],
      }));

      const results = await Promise.all(
        queries.map((q) => client.execute(q.query, q.params, { prepare: true }))
      );

      const allRows = results.flatMap((result) => result.rows);
      allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allRows.slice(0, limit).map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by event type:", error);
      throw error;
    }
  }

  /**
   * Generate date range array
   */
  static generateDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
  }

  /**
   * Thống kê events theo ngày
   */
  static async getDailyStats(date) {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        SELECT event_type, COUNT(*) as count
        FROM user_logs.events_by_date 
        WHERE created_date = ?
        GROUP BY event_type
      `;

      const result = await client.execute(query, [date], { prepare: true });

      const stats = {};
      result.rows.forEach((row) => {
        stats[row.event_type] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      console.error("Error getting daily stats:", error);
      throw error;
    }
  }

  /**
   * Lấy top pages theo số events
   */
  static async getTopPages(startDate, endDate = null, limit = 10) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      // Query each date separately and aggregate
      const pageStats = new Map();

      for (const date of dates) {
        const query = `
          SELECT page_url, COUNT(*) as count
          FROM user_logs.events_by_date 
          WHERE created_date = ?
          GROUP BY page_url
        `;

        const result = await client.execute(query, [date], { prepare: true });

        result.rows.forEach((row) => {
          const current = pageStats.get(row.page_url) || 0;
          pageStats.set(row.page_url, current + parseInt(row.count));
        });
      }

      // Sort and limit
      const sortedPages = Array.from(pageStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([page_url, count]) => ({ page_url, count }));

      return sortedPages;
    } catch (error) {
      console.error("Error getting top pages:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      created_date: this.created_date,
      timestamp: this.timestamp,
      event_type: this.event_type,
      element_type: this.element_type,
      page_url: this.page_url,
      element_id: this.element_id,
      metadata: this.metadata,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      session_id: this.session_id,
    };
  }
}
