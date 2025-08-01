// models/User.js
// Model để quản lý users (visitors) với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class User {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || null;
    this.email = data.email || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  /**
   * Tạo user mới
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO user_logs.users (id, name, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      const params = [
        this.id,
        this.name,
        this.email,
        this.created_at,
        this.updated_at,
      ];

      await client.execute(query, params, { prepare: true });
      return this;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Tìm user theo email
   */
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

  /**
   * Tìm user theo ID
   */
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

  /**
   * Cập nhật user
   */
  async update(updateData) {
    try {
      const client = cassandraConnection.getClient();
      const fields = [];
      const values = [];

      if (updateData.name !== undefined) {
        this.name = updateData.name;
        fields.push("name = ?");
        values.push(this.name);
      }
      if (updateData.email !== undefined) {
        this.email = updateData.email;
        fields.push("email = ?");
        values.push(this.email);
      }

      this.updated_at = new Date();
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

  /**
   * Xóa user
   */
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

  /**
   * Lấy tất cả users
   */
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
