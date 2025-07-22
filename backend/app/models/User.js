// models/User.js
import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  static async create(userData) {
    try {
      const client = cassandraConnection.getClient();
      const user = new User(userData);

      const query = `
        INSERT INTO user_logs.users (id, name, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      await client.execute(
        query,
        [user.id, user.name, user.email, user.created_at, user.updated_at],
        { prepare: true }
      );

      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.users WHERE id = ?";
      const result = await client.execute(query, [id], { prepare: true });

      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error finding user by id:", error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.users WHERE email = ? ALLOW FILTERING";
      const result = await client.execute(query, [email], { prepare: true });

      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.users LIMIT ?";
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new User(row));
    } catch (error) {
      console.error("Error finding all users:", error);
      throw error;
    }
  }

  async update(updateData) {
    try {
      const client = cassandraConnection.getClient();
      this.updated_at = new Date();

      const fields = [];
      const values = [];

      if (updateData.name) {
        fields.push("name = ?");
        values.push(updateData.name);
        this.name = updateData.name;
      }

      if (updateData.email) {
        fields.push("email = ?");
        values.push(updateData.email);
        this.email = updateData.email;
      }

      fields.push("updated_at = ?");
      values.push(this.updated_at);
      values.push(this.id);

      const query = `UPDATE user_logs.users SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await client.execute(query, values, { prepare: true });

      return this;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async delete() {
    try {
      const client = cassandraConnection.getClient();
      const query = "DELETE FROM user_logs.users WHERE id = ?";
      await client.execute(query, [this.id], { prepare: true });
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

export class UserEvent {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.user_id = data.user_id;
    this.event_type = data.event_type; // click, view, scroll, hover, load
    this.element_type = data.element_type; // image, blog, review, service, button, link
    this.page_url = data.page_url;
    this.element_id = data.element_id;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.session_id = data.session_id;
    this.created_date =
      data.created_date || new Date().toISOString().split("T")[0];
  }

  static async create(eventData) {
    try {
      const client = cassandraConnection.getClient();
      const event = new UserEvent(eventData);

      // Insert into user_events table
      const userEventsQuery = `
        INSERT INTO user_events (
          id, user_id, event_type, element_type, page_url, element_id,
          timestamp, metadata, ip_address, user_agent, session_id, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Insert into events_by_date table for analytics
      const eventsByDateQuery = `
        INSERT INTO events_by_date (
          created_date, timestamp, id, user_id, event_type, element_type,
          page_url, element_id, metadata, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        event.id,
        event.user_id,
        event.event_type,
        event.element_type,
        event.page_url,
        event.element_id,
        event.timestamp,
        event.metadata,
        event.ip_address,
        event.user_agent,
        event.session_id,
        event.created_date,
      ];

      // Execute both queries
      await Promise.all([
        client.execute(userEventsQuery, params),
        client.execute(eventsByDateQuery, [
          event.created_date,
          event.timestamp,
          ...params.slice(0, -1), // exclude created_date from the end
        ]),
      ]);

      return event;
    } catch (error) {
      console.error("Error creating user event:", error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const today = new Date().toISOString().split("T")[0];

      const query = `
        SELECT * FROM user_events 
        WHERE user_id = ? AND created_date = ?
        LIMIT ?
      `;

      const result = await client.execute(query, [userId, today, limit]);
      return result.rows.map((row) => new UserEvent(row));
    } catch (error) {
      console.error("Error finding events by user id:", error);
      throw error;
    }
  }

  static async findByDateRange(startDate, endDate, limit = 1000) {
    try {
      const client = cassandraConnection.getClient();

      const query = `
        SELECT * FROM events_by_date 
        WHERE created_date >= ? AND created_date <= ?
        LIMIT ?
      `;

      const result = await client.execute(query, [startDate, endDate, limit]);
      return result.rows.map((row) => new UserEvent(row));
    } catch (error) {
      console.error("Error finding events by date range:", error);
      throw error;
    }
  }

  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const today = new Date().toISOString().split("T")[0];

      const query = `
        SELECT * FROM events_by_date 
        WHERE created_date = ?
        LIMIT ?
      `;

      const result = await client.execute(query, [today, limit]);
      return result.rows.map((row) => new UserEvent(row));
    } catch (error) {
      console.error("Error finding all events:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      event_type: this.event_type,
      element_type: this.element_type,
      page_url: this.page_url,
      element_id: this.element_id,
      timestamp: this.timestamp,
      metadata: this.metadata,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      session_id: this.session_id,
      created_date: this.created_date,
    };
  }
}

export default { User, UserEvent };
