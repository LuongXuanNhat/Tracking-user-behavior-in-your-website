// models/User.js
// Model để quản lý users (visitors và identified users) với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import process from "process";

const KEYSPACE = process.env.CASSANDRA_KEYSPACE || "user_behavior_analytics";

export class User {
  constructor(data = {}) {
    // For visitors (anonymous users)
    this.visitor_id = data.visitor_id || uuidv4();
    this.website_id = data.website_id;
    this.first_seen = data.first_seen || new Date();
    this.last_seen = data.last_seen || new Date();
    this.session_count = data.session_count || 0;
    this.page_views = data.page_views || 0;
    this.total_time_spent = data.total_time_spent || 0;
    this.device_info = data.device_info || {};
    this.location_info = data.location_info || {};
    this.referrer = data.referrer || null;
    this.utm_source = data.utm_source || null;
    this.utm_medium = data.utm_medium || null;
    this.utm_campaign = data.utm_campaign || null;

    // For identified users
    this.user_id = data.user_id || null;
    this.external_user_id = data.external_user_id || null;
    this.email = data.email || null;
    this.properties = data.properties || {};
    this.first_identified = data.first_identified || null;
    this.last_activity = data.last_activity || null;
    this.lifetime_value = data.lifetime_value || null;
    this.segment = data.segment || null;
  }

  /**
   * Tạo visitor mới (anonymous user)
   */
  async createVisitor() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO ${KEYSPACE}.visitors (
          visitor_id, website_id, first_seen, last_seen, session_count,
          page_views, total_time_spent, device_info, location_info,
          referrer, utm_source, utm_medium, utm_campaign
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        this.visitor_id,
        this.website_id,
        this.first_seen,
        this.last_seen,
        this.session_count,
        this.page_views,
        this.total_time_spent,
        new Map(Object.entries(this.device_info)),
        new Map(Object.entries(this.location_info)),
        this.referrer,
        this.utm_source,
        this.utm_medium,
        this.utm_campaign,
      ];

      await client.execute(query, params, { prepare: true });
      return this;
    } catch (error) {
      console.error("Failed to create visitor:", error);
      throw new Error(`Failed to create visitor: ${error.message}`);
    }
  }

  /**
   * Tạo identified user mới
   */
  async createIdentifiedUser() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO ${KEYSPACE}.identified_users (
          user_id, website_id, external_user_id, email, properties,
          first_identified, last_activity, visitor_id, lifetime_value, segment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        this.user_id || uuidv4(),
        this.website_id,
        this.external_user_id,
        this.email,
        new Map(Object.entries(this.properties)),
        this.first_identified || new Date(),
        this.last_activity || new Date(),
        this.visitor_id,
        this.lifetime_value,
        this.segment,
      ];

      await client.execute(query, params, { prepare: true });
      return this;
    } catch (error) {
      console.error("Failed to create identified user:", error);
      throw new Error(`Failed to create identified user: ${error.message}`);
    }
  }

  /**
   * Tìm visitor theo ID
   */
  static async findVisitorById(visitor_id) {
    try {
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.visitors WHERE visitor_id = ?`;
      const result = await client.execute(query, [visitor_id], {
        prepare: true,
      });

      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error finding visitor by id:", error);
      throw error;
    }
  }

  /**
   * Tìm identified user theo external user ID
   */
  static async findIdentifiedByExternalId(external_user_id) {
    try {
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.identified_users WHERE external_user_id = ? ALLOW FILTERING`;
      const result = await client.execute(query, [external_user_id], {
        prepare: true,
      });

      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error finding identified user by external id:", error);
      throw error;
    }
  }

  /**
   * Tìm identified user theo email
   */
  static async findIdentifiedByEmail(email) {
    try {
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.identified_users WHERE email = ? ALLOW FILTERING`;
      const result = await client.execute(query, [email], { prepare: true });

      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error finding identified user by email:", error);
      throw error;
    }
  }

  /**
   * Cập nhật visitor
   */
  async updateVisitor(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      if (updateData.last_seen !== undefined) {
        this.last_seen = updateData.last_seen;
        fields.push("last_seen = ?");
        values.push(this.last_seen);
      }
      if (updateData.device_info !== undefined) {
        this.device_info = { ...this.device_info, ...updateData.device_info };
        fields.push("device_info = ?");
        values.push(new Map(Object.entries(this.device_info)));
      }
      if (updateData.location_info !== undefined) {
        this.location_info = {
          ...this.location_info,
          ...updateData.location_info,
        };
        fields.push("location_info = ?");
        values.push(new Map(Object.entries(this.location_info)));
      }

      // Update counters separately using UPDATE ... SET counter = counter + value
      if (updateData.session_count_increment !== undefined) {
        const counterQuery = `UPDATE ${KEYSPACE}.visitors SET session_count = session_count + ? WHERE visitor_id = ?`;
        await client.execute(
          counterQuery,
          [updateData.session_count_increment, this.visitor_id],
          { prepare: true }
        );
      }
      if (updateData.page_views_increment !== undefined) {
        const counterQuery = `UPDATE ${KEYSPACE}.visitors SET page_views = page_views + ? WHERE visitor_id = ?`;
        await client.execute(
          counterQuery,
          [updateData.page_views_increment, this.visitor_id],
          { prepare: true }
        );
      }
      if (updateData.total_time_increment !== undefined) {
        this.total_time_spent += updateData.total_time_increment;
        fields.push("total_time_spent = ?");
        values.push(this.total_time_spent);
      }

      if (fields.length > 0) {
        values.push(this.visitor_id);
        const query = `UPDATE ${KEYSPACE}.visitors SET ${fields.join(
          ", "
        )} WHERE visitor_id = ?`;
        await client.execute(query, values, { prepare: true });
      }

      return this;
    } catch (error) {
      console.error("Error updating visitor:", error);
      throw error;
    }
  }

  /**
   * Cập nhật identified user
   */
  async updateIdentifiedUser(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      if (updateData.email !== undefined) {
        this.email = updateData.email;
        fields.push("email = ?");
        values.push(this.email);
      }
      if (updateData.properties !== undefined) {
        this.properties = { ...this.properties, ...updateData.properties };
        fields.push("properties = ?");
        values.push(new Map(Object.entries(this.properties)));
      }
      if (updateData.last_activity !== undefined) {
        this.last_activity = updateData.last_activity;
        fields.push("last_activity = ?");
        values.push(this.last_activity);
      }
      if (updateData.lifetime_value !== undefined) {
        this.lifetime_value = updateData.lifetime_value;
        fields.push("lifetime_value = ?");
        values.push(this.lifetime_value);
      }
      if (updateData.segment !== undefined) {
        this.segment = updateData.segment;
        fields.push("segment = ?");
        values.push(this.segment);
      }

      if (fields.length > 0) {
        values.push(this.user_id);
        const query = `UPDATE ${KEYSPACE}.identified_users SET ${fields.join(
          ", "
        )} WHERE user_id = ?`;
        await client.execute(query, values, { prepare: true });
      }

      return this;
    } catch (error) {
      console.error("Error updating identified user:", error);
      throw error;
    }
  }

  toJSON() {
    if (this.user_id) {
      // Identified user
      return {
        user_id: this.user_id,
        website_id: this.website_id,
        external_user_id: this.external_user_id,
        email: this.email,
        properties: this.properties,
        first_identified: this.first_identified,
        last_activity: this.last_activity,
        visitor_id: this.visitor_id,
        lifetime_value: this.lifetime_value,
        segment: this.segment,
      };
    } else {
      // Visitor
      return {
        visitor_id: this.visitor_id,
        website_id: this.website_id,
        first_seen: this.first_seen,
        last_seen: this.last_seen,
        session_count: this.session_count,
        page_views: this.page_views,
        total_time_spent: this.total_time_spent,
        device_info: this.device_info,
        location_info: this.location_info,
        referrer: this.referrer,
        utm_source: this.utm_source,
        utm_medium: this.utm_medium,
        utm_campaign: this.utm_campaign,
      };
    }
  }
}
