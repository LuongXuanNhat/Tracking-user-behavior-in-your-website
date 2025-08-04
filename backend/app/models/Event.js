// models/Event.js
// Model để quản lý user events với Cassandra integration
// Tái cấu trúc theo schema database_v2.cql

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import process from "process";

const KEYSPACE = process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics";

export class Event {
  constructor(data = {}) {
    // Core identifiers
    this.event_id = data.event_id || uuidv4();
    this.website_id = this.validateUUID(data.website_id, "website_id");
    this.visitor_id = this.validateUUID(data.visitor_id, "visitor_id");
    this.user_id = data.user_id
      ? this.validateUUID(data.user_id, "user_id")
      : null; // null for anonymous users
    this.session_id = this.validateUUID(data.session_id, "session_id");

    // Time tracking
    this.event_date = data.event_date || this.formatDate(new Date()); // YYYY-MM-DD
    this.event_time = data.event_time || new Date();

    // Event details
    this.event_type = data.event_type; // pageview, click, scroll, form_submit, purchase, etc.
    this.event_name = data.event_name; // specific event name

    // Page information
    this.page_url = data.page_url;
    this.page_title = data.page_title;

    // Element information
    this.element_selector = data.element_selector;
    this.element_text = data.element_text;

    // Device and browser information
    this.browser = data.browser
      ? data.browser
      : this.parseBrowserName(data.browser || data.user_agent);
    this.device_type =
      data.device_type ||
      this.detectDeviceType(data.browser || data.user_agent); // desktop, mobile, tablet

    this.os = data.os ? data.os : this.parseOS(data.browser || data.user_agent);

    // Location and tracking
    this.ip_address = data.ip_address;
    this.country = data.country;
    this.city = data.city;
    this.referrer = data.referrer;

    // UTM parameters
    this.utm_source = data.utm_source;
    this.utm_medium = data.utm_medium;
    this.utm_campaign = data.utm_campaign;

    // Session context for events_by_session table
    this.duration_since_start = data.duration_since_start; // milliseconds since session start

    // Initialize properties properly
    if (data.properties) {
      if (data.properties instanceof Map) {
        this.properties = Object.fromEntries(data.properties);
      } else if (
        typeof data.properties === "object" &&
        !Array.isArray(data.properties)
      ) {
        this.properties = data.properties;
      } else {
        this.properties = {};
      }
    } else {
      this.properties = {};
    }
  }

  /**
   * Parse browser name from user agent string
   */
  parseBrowserName(userAgentString) {
    if (!userAgentString) {
      return "Unknown";
    }

    const userAgent = userAgentString.toLowerCase();

    // Browser detection patterns - order matters (more specific first)
    if (userAgent.includes("edg/")) {
      return "Microsoft Edge";
    } else if (userAgent.includes("chrome/") && !userAgent.includes("edg/")) {
      return "Chrome";
    } else if (userAgent.includes("firefox/")) {
      return "Firefox";
    } else if (
      userAgent.includes("safari/") &&
      !userAgent.includes("chrome/")
    ) {
      return "Safari";
    } else if (userAgent.includes("opera/") || userAgent.includes("opr/")) {
      return "Opera";
    } else if (userAgent.includes("msie") || userAgent.includes("trident/")) {
      return "Internet Explorer";
    } else if (userAgent.includes("samsung")) {
      return "Samsung Internet";
    } else if (userAgent.includes("ucbrowser")) {
      return "UC Browser";
    } else if (userAgent.includes("yabrowser")) {
      return "Yandex Browser";
    } else if (userAgent.includes("vivaldi")) {
      return "Vivaldi";
    } else if (userAgent.includes("brave")) {
      return "Brave";
    } else {
      return "Unknown";
    }
  }

  /**
   * Parse OS from user agent string
   */
  parseOS(userAgentString) {
    if (!userAgentString) {
      return "Unknown";
    }

    const userAgent = userAgentString.toLowerCase();

    // OS detection patterns
    if (userAgent.includes("windows nt 10.0")) {
      return "Windows 10/11";
    } else if (userAgent.includes("windows nt 6.3")) {
      return "Windows 8.1";
    } else if (userAgent.includes("windows nt 6.2")) {
      return "Windows 8";
    } else if (userAgent.includes("windows nt 6.1")) {
      return "Windows 7";
    } else if (userAgent.includes("windows")) {
      return "Windows";
    } else if (userAgent.includes("mac os x")) {
      const macMatch = userAgent.match(/mac os x (\d+[._]\d+)/);
      return macMatch ? `macOS ${macMatch[1].replace("_", ".")}` : "macOS";
    } else if (userAgent.includes("iphone os")) {
      const iosMatch = userAgent.match(/iphone os (\d+[._]\d+)/);
      return iosMatch ? `iOS ${iosMatch[1].replace("_", ".")}` : "iOS";
    } else if (userAgent.includes("ipad")) {
      return "iPadOS";
    } else if (userAgent.includes("android")) {
      const androidMatch = userAgent.match(/android (\d+\.?\d*)/);
      return androidMatch ? `Android ${androidMatch[1]}` : "Android";
    } else if (userAgent.includes("linux")) {
      return "Linux";
    } else if (userAgent.includes("ubuntu")) {
      return "Ubuntu";
    } else if (userAgent.includes("cros")) {
      return "Chrome OS";
    } else {
      return "Unknown";
    }
  }

  /**
   * Detect device type from browser/user agent string
   */
  detectDeviceType(browserString) {
    if (!browserString) {
      return "desktop"; // default fallback
    }

    const userAgent = browserString.toLowerCase();

    // Mobile patterns
    const mobilePatterns = [
      /mobile/,
      /android/,
      /iphone/,
      /ipod/,
      /blackberry/,
      /windows phone/,
      /opera mini/,
      /iemobile/,
      /webos/,
      /palm/,
      /symbian/,
      /nokia/,
      /samsung/,
      /htc/,
      /motorola/,
      /fennec/,
      /mobi/,
    ];

    // Tablet patterns
    const tabletPatterns = [
      /ipad/,
      /tablet/,
      /kindle/,
      /silk/,
      /playbook/,
      /gt-p\d{4}/,
      /sm-t\d{3}/,
      /android(?!.*mobile)/,
    ];

    // Check for tablet first (more specific)
    for (const pattern of tabletPatterns) {
      if (pattern.test(userAgent)) {
        return "tablet";
      }
    }

    // Then check for mobile
    for (const pattern of mobilePatterns) {
      if (pattern.test(userAgent)) {
        return "mobile";
      }
    }

    // Default to desktop
    return "desktop";
  }

  /**
   * Validate required fields before saving
   */
  validateRequiredFields() {
    const requiredFields = {
      website_id: this.website_id,
      visitor_id: this.visitor_id,
      session_id: this.session_id,
      event_type: this.event_type,
      event_date: this.event_date,
      event_time: this.event_time,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        throw new Error(
          `Required field ${field} is missing or invalid: ${value}`
        );
      }
    }

    // Additional UUID validation
    const uuidFields = ["website_id", "visitor_id", "session_id"];
    if (this.user_id) {
      uuidFields.push("user_id");
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const field of uuidFields) {
      const value = this[field];
      if (value && !uuidRegex.test(value)) {
        throw new Error(`Invalid UUID format for ${field}: ${value}`);
      }
    }
  }

  /**
   * Validate UUID format
   */
  validateUUID(uuid, fieldName) {
    if (!uuid) {
      throw new Error(
        `${fieldName} is required and cannot be null or undefined`
      );
    }
    const uuidStr = uuid.toString?.();
    // Check if it's already a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof uuidStr === "string" && uuidRegex.test(uuidStr)) {
      return uuidStr;
    }

    console.warn(
      `Invalid UUID format for ${fieldName}: ${uuid}, generating new UUID`
    );
    return uuidv4();
  }

  /**
   * Format date cho partition key
   */
  formatDate(date) {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Tạo event mới - lưu vào multiple tables để optimize queries theo schema mới
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();

      // Validate required fields before saving
      this.validateRequiredFields();

      // Convert properties to Map for Cassandra
      const propertiesMap = new Map(Object.entries(this.properties));

      // 1. Lưu vào events table (partitioned by website_id and event_date)
      const eventsQuery = `
        INSERT INTO ${KEYSPACE}.events (
          website_id, event_date, event_time, event_id, visitor_id, user_id,
          session_id, event_type, event_name, page_url, page_title,
          element_selector, element_text, properties, device_type, browser, os,
          ip_address, country, city, referrer, utm_source, utm_medium, utm_campaign
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // 2. Lưu vào events_by_user table (partitioned by website_id and visitor_id)
      const eventsByUserQuery = `
        INSERT INTO ${KEYSPACE}.events_by_user (
          website_id, visitor_id, event_time, event_id, session_id,
          event_type, event_name, page_url, properties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // 3. Lưu vào events_by_session table (partitioned by website_id and session_id)
      const eventsBySessionQuery = `
        INSERT INTO ${KEYSPACE}.events_by_session (
          website_id, session_id, event_time, event_id, visitor_id,
          event_type, event_name, page_url, duration_since_start, properties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // 4. Lưu vào events_by_type table (partitioned by website_id and event_type)
      const eventsByTypeQuery = `
        INSERT INTO ${KEYSPACE}.events_by_type (
          website_id, event_type, event_date, event_time, event_id,
          visitor_id, session_id, page_url, properties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const eventsParams = [
        this.website_id,
        this.event_date,
        this.event_time,
        this.event_id,
        this.visitor_id,
        this.user_id,
        this.session_id,
        this.event_type,
        this.event_name,
        this.page_url,
        this.page_title,
        this.element_selector,
        this.element_text,
        propertiesMap,
        this.device_type,
        this.browser,
        this.os,
        this.ip_address,
        this.country,
        this.city,
        this.referrer,
        this.utm_source,
        this.utm_medium,
        this.utm_campaign,
      ];

      const eventsByUserParams = [
        this.website_id,
        this.visitor_id,
        this.event_time,
        this.event_id,
        this.session_id,
        this.event_type,
        this.event_name,
        this.page_url,
        propertiesMap,
      ];

      const eventsBySessionParams = [
        this.website_id,
        this.session_id,
        this.event_time,
        this.event_id,
        this.visitor_id,
        this.event_type,
        this.event_name,
        this.page_url,
        this.duration_since_start,
        propertiesMap,
      ];

      const eventsByTypeParams = [
        this.website_id,
        this.event_type,
        this.event_date,
        this.event_time,
        this.event_id,
        this.visitor_id,
        this.session_id,
        this.page_url,
        propertiesMap,
      ];

      // Execute all queries in parallel
      await Promise.all([
        client.execute(eventsQuery, eventsParams, { prepare: true }),
        client.execute(eventsByUserQuery, eventsByUserParams, {
          prepare: true,
        }),
        client.execute(eventsBySessionQuery, eventsBySessionParams, {
          prepare: true,
        }),
        client.execute(eventsByTypeQuery, eventsByTypeParams, {
          prepare: true,
        }),
      ]);

      return this;
    } catch (error) {
      console.error("Failed to save event to Cassandra:", error);
      console.error("Event data:", {
        event_id: this.event_id,
        website_id: this.website_id,
        visitor_id: this.visitor_id,
        user_id: this.user_id,
        session_id: this.session_id,
        event_type: this.event_type,
        event_name: this.event_name,
      });
      throw new Error(`Failed to save event: ${error.message}`);
    }
  }

  /**
   * Static method để tạo Event an toàn với validation
   */
  static createSafe(data = {}) {
    try {
      // Ensure required UUIDs are provided or generated
      const safeData = {
        ...data,
        website_id: data.website_id || uuidv4(),
        visitor_id: data.visitor_id || uuidv4(),
        session_id: data.session_id || uuidv4(),
        event_type: data.event_type || "pageview",
        event_name: data.event_name || data.event_type || "pageview",
      };

      return new Event(safeData);
    } catch (error) {
      console.error("Error creating safe Event:", error);
      throw new Error(`Failed to create Event: ${error.message}`);
    }
  }

  /**
   * Tìm events theo website và date range từ bảng events chính
   */
  static async findByWebsiteAndDate(
    websiteId,
    startDate,
    endDate = null,
    limit = 100
  ) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      let query, params;

      if (startDate === endDate) {
        // Single day query
        query = `
          SELECT * FROM ${KEYSPACE}.events 
          WHERE website_id = ? AND event_date = ?
          ORDER BY event_time DESC
          LIMIT ?
        `;
        params = [websiteId, startDate, limit];
      } else {
        // Multiple days - need to query each day separately
        const dates = this.generateDateRange(startDate, endDate);
        const queries = dates.map((date) => ({
          query: `
            SELECT * FROM ${KEYSPACE}.events 
            WHERE website_id = ? AND event_date = ?
            ORDER BY event_time DESC
          `,
          params: [websiteId, date],
        }));

        const results = await Promise.all(
          queries.map((q) =>
            client.execute(q.query, q.params, { prepare: true })
          )
        );

        const allRows = results.flatMap((result) => result.rows);
        allRows.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

        return allRows.slice(0, limit).map((row) => new Event(row));
      }

      const result = await client.execute(query, params, { prepare: true });
      return result.rows.map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by website and date:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo visitor ID (user journey analysis)
   */
  static async findByVisitor(websiteId, visitorId, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      const query = `
        SELECT * FROM ${KEYSPACE}.events_by_user 
        WHERE website_id = ? AND visitor_id = ?
        ORDER BY event_time DESC
        LIMIT ?
      `;

      const result = await client.execute(
        query,
        [websiteId, visitorId, limit],
        {
          prepare: true,
        }
      );
      return result.rows.map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by visitor:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo session ID (session analysis)
   */
  static async findBySession(websiteId, sessionId, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      const query = `
        SELECT * FROM ${KEYSPACE}.events_by_session 
        WHERE website_id = ? AND session_id = ?
        ORDER BY event_time ASC
        LIMIT ?
      `;

      const result = await client.execute(
        query,
        [websiteId, sessionId, limit],
        {
          prepare: true,
        }
      );
      return result.rows.map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by session:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo event type (event-specific analytics)
   */
  static async findByEventType(
    websiteId,
    eventType,
    startDate,
    endDate = null,
    limit = 100
  ) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      if (startDate === endDate) {
        // Single day query
        const query = `
          SELECT * FROM ${KEYSPACE}.events_by_type 
          WHERE website_id = ? AND event_type = ? AND event_date = ?
          ORDER BY event_time DESC
          LIMIT ?
        `;
        const result = await client.execute(
          query,
          [websiteId, eventType, startDate, limit],
          {
            prepare: true,
          }
        );
        return result.rows.map((row) => new Event(row));
      } else {
        // Multiple days
        const dates = this.generateDateRange(startDate, endDate);
        const queries = dates.map((date) => ({
          query: `
            SELECT * FROM ${KEYSPACE}.events_by_type 
            WHERE website_id = ? AND event_type = ? AND event_date = ?
            ORDER BY event_time DESC
          `,
          params: [websiteId, eventType, date],
        }));

        const results = await Promise.all(
          queries.map((q) =>
            client.execute(q.query, q.params, { prepare: true })
          )
        );

        const allRows = results.flatMap((result) => result.rows);
        allRows.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

        return allRows.slice(0, limit).map((row) => new Event(row));
      }
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
   * Thống kê events theo website và ngày
   */
  static async getDailyStats(websiteIdOrDate, date = null) {
    try {
      const client = cassandraConnection.getClient();

      let query, params;

      // Handle overloaded method - if only one parameter, treat it as date (global stats)
      if (date === null) {
        // Global stats for all websites on given date
        const targetDate = websiteIdOrDate;
        query = `
          SELECT event_type, COUNT(*) as count
          FROM ${KEYSPACE}.events 
          WHERE event_date = ?
          GROUP BY event_type
          ALLOW FILTERING
        `;
        params = [targetDate];
      } else {
        // Stats for specific website and date
        const websiteId = websiteIdOrDate;
        query = `
          SELECT event_type, COUNT(*) as count
          FROM ${KEYSPACE}.events 
          WHERE website_id = ? AND event_date = ?
          GROUP BY event_type
          ALLOW FILTERING
        `;
        params = [websiteId, date];
      }

      const result = await client.execute(query, params, {
        prepare: true,
      });

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
   * Lấy top pages theo số events cho website (overloaded method)
   */
  static async getTopPages(
    websiteIdOrStartDate,
    startDateOrEndDate = null,
    endDateOrLimit = null,
    limitOrNull = 10
  ) {
    try {
      const client = cassandraConnection.getClient();

      let websiteId, startDate, endDate, limit;

      // Handle overloaded method signatures
      if (
        startDateOrEndDate === null ||
        typeof startDateOrEndDate === "number"
      ) {
        // Global stats: getTopPages(startDate, endDate, limit) or getTopPages(startDate, limit)
        startDate = websiteIdOrStartDate;
        if (typeof startDateOrEndDate === "number") {
          // getTopPages(startDate, limit)
          endDate = startDate;
          limit = startDateOrEndDate;
        } else {
          // getTopPages(startDate, endDate, limit)
          endDate = endDateOrLimit || startDate;
          limit = limitOrNull;
        }
        websiteId = null;
      } else {
        // Website-specific stats: getTopPages(websiteId, startDate, endDate, limit)
        websiteId = websiteIdOrStartDate;
        startDate = startDateOrEndDate;
        endDate = endDateOrLimit || startDate;
        limit = limitOrNull;
      }

      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      // Query each date separately and aggregate
      const pageStats = new Map();

      for (const date of dates) {
        let query, params;

        if (websiteId) {
          // Website-specific query
          query = `
            SELECT page_url, COUNT(*) as count
            FROM ${KEYSPACE}.events 
            WHERE website_id = ? AND event_date = ?
            GROUP BY page_url
            ALLOW FILTERING
          `;
          params = [websiteId, date];
        } else {
          // Global query for all websites
          query = `
            SELECT page_url, COUNT(*) as count
            FROM ${KEYSPACE}.events 
            WHERE event_date = ?
            GROUP BY page_url
            ALLOW FILTERING
          `;
          params = [date];
        }

        const result = await client.execute(query, params, {
          prepare: true,
        });

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

  /**
   * Lấy event metrics theo event type cho website
   */
  static async getEventTypeMetrics(
    websiteId,
    eventType,
    startDate,
    endDate = null
  ) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      let totalCount = 0;
      const uniqueVisitors = new Set();

      for (const date of dates) {
        const query = `
          SELECT visitor_id, COUNT(*) as count
          FROM ${KEYSPACE}.events_by_type 
          WHERE website_id = ? AND event_type = ? AND event_date = ?
          GROUP BY visitor_id
        `;

        const result = await client.execute(
          query,
          [websiteId, eventType, date],
          { prepare: true }
        );

        result.rows.forEach((row) => {
          totalCount += parseInt(row.count);
          uniqueVisitors.add(row.visitor_id);
        });
      }

      return {
        total_count: totalCount,
        unique_visitors: uniqueVisitors.size,
        event_type: eventType,
        date_range: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error("Error getting event type metrics:", error);
      throw error;
    }
  }

  /**
   * Lấy session timeline - events trong một session theo thứ tự thời gian
   */
  static async getSessionTimeline(websiteId, sessionId) {
    try {
      const client = cassandraConnection.getClient();

      const query = `
        SELECT * FROM ${KEYSPACE}.events_by_session 
        WHERE website_id = ? AND session_id = ?
        ORDER BY event_time ASC
      `;

      const result = await client.execute(query, [websiteId, sessionId], {
        prepare: true,
      });
      return result.rows.map((row) => new Event(row));
    } catch (error) {
      console.error("Error getting session timeline:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo date range (không cần website_id - cho global queries)
   */
  static async findByDateRange(startDate, endDate = null, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      // Generate date range
      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      const allEvents = [];

      // Query each date separately and collect results
      for (const date of dates) {
        const query = `
          SELECT * FROM ${KEYSPACE}.events 
          WHERE event_date = ?
          ALLOW FILTERING
        `;

        const result = await client.execute(query, [date], {
          prepare: true,
        });

        allEvents.push(...result.rows);
      }

      // Sort by event_time descending and apply limit
      allEvents.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

      return allEvents.slice(0, limit).map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by date range:", error);
      throw error;
    }
  }

  /**
   * Tìm events theo user ID
   */
  static async findByUserId(userId, startDate, endDate = null, limit = 100) {
    try {
      const client = cassandraConnection.getClient();

      if (!endDate) endDate = startDate;

      // Generate date range
      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      const allEvents = [];

      // Query each date separately
      for (const date of dates) {
        const query = `
          SELECT * FROM ${KEYSPACE}.events 
          WHERE event_date = ? AND visitor_id = ?
          ALLOW FILTERING
        `;

        const result = await client.execute(query, [date, userId], {
          prepare: true,
        });

        allEvents.push(...result.rows);
      }

      // Sort by event_time descending and apply limit
      allEvents.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

      return allEvents.slice(0, limit).map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by user ID:", error);
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

      // Generate date range
      const dates =
        startDate === endDate
          ? [startDate]
          : this.generateDateRange(startDate, endDate);

      const allEvents = [];

      // Query each date separately
      for (const date of dates) {
        const query = `
          SELECT * FROM ${KEYSPACE}.events 
          WHERE event_date = ? AND session_id = ?
          ALLOW FILTERING
        `;

        const result = await client.execute(query, [date, sessionId], {
          prepare: true,
        });

        allEvents.push(...result.rows);
      }

      // Sort by event_time ascending for session timeline
      allEvents.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

      return allEvents.slice(0, limit).map((row) => new Event(row));
    } catch (error) {
      console.error("Error finding events by session ID:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      event_id: this.event_id,
      website_id: this.website_id,
      visitor_id: this.visitor_id,
      user_id: this.user_id,
      session_id: this.session_id,
      event_date: this.event_date,
      event_time: this.event_time,
      event_type: this.event_type,
      event_name: this.event_name,
      page_url: this.page_url,
      page_title: this.page_title,
      element_selector: this.element_selector,
      element_text: this.element_text,
      device_type: this.device_type,
      browser: this.browser,
      os: this.os,
      ip_address: this.ip_address,
      country: this.country,
      city: this.city,
      referrer: this.referrer,
      utm_source: this.utm_source,
      utm_medium: this.utm_medium,
      utm_campaign: this.utm_campaign,
      duration_since_start: this.duration_since_start,
      properties: this.properties,
    };
  }
}
