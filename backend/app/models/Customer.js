// models/Customer.js
// Model để quản lý customers với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";

export class Customer {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.status = data.status || "active";
    this.subscription_plan = data.subscription_plan || "free";
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_login = data.last_login || null;
    this.settings = data.settings || {};
  }

  /**
   * Tạo customer mới
   */
  async create() {
    try {
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO user_logs.customers (
          id, name, email, password_hash, status, subscription_plan,
          created_at, updated_at, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        this.id,
        this.name,
        this.email,
        this.password_hash,
        this.status,
        this.subscription_plan,
        this.created_at,
        this.updated_at,
        new Map(Object.entries(this.settings)),
      ];

      await client.execute(query, params, { prepare: true });
      return this;
    } catch (error) {
      console.error("Failed to create customer:", error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Tìm customer theo email
   */
  static async findByEmail(email) {
    try {
      const client = cassandraConnection.getClient();
      const query =
        "SELECT * FROM user_logs.customers WHERE email = ? ALLOW FILTERING";
      const result = await client.execute(query, [email], { prepare: true });

      if (result.rows.length === 0) return null;
      return new Customer(result.rows[0]);
    } catch (error) {
      console.error("Error finding customer by email:", error);
      throw error;
    }
  }

  /**
   * Tìm customer theo ID
   */
  static async findById(id) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.customers WHERE id = ?";
      const result = await client.execute(query, [id], { prepare: true });

      if (result.rows.length === 0) return null;
      return new Customer(result.rows[0]);
    } catch (error) {
      console.error("Error finding customer by id:", error);
      throw error;
    }
  }

  /**
   * Cập nhật customer
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
      if (updateData.password_hash !== undefined) {
        this.password_hash = updateData.password_hash;
        fields.push("password_hash = ?");
        values.push(this.password_hash);
      }
      if (updateData.status !== undefined) {
        this.status = updateData.status;
        fields.push("status = ?");
        values.push(this.status);
      }
      if (updateData.subscription_plan !== undefined) {
        this.subscription_plan = updateData.subscription_plan;
        fields.push("subscription_plan = ?");
        values.push(this.subscription_plan);
      }
      if (updateData.settings !== undefined) {
        this.settings = { ...this.settings, ...updateData.settings };
        fields.push("settings = ?");
        values.push(new Map(Object.entries(this.settings)));
      }
      if (updateData.last_login !== undefined) {
        this.last_login = updateData.last_login;
        fields.push("last_login = ?");
        values.push(this.last_login);
      }

      this.updated_at = new Date();
      fields.push("updated_at = ?");
      values.push(this.updated_at);
      values.push(this.id);

      const query = `UPDATE user_logs.customers SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await client.execute(query, values, { prepare: true });

      return this;
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  /**
   * Xác thực đăng nhập
   */
  static async authenticate(email, password) {
    try {
      const customer = await this.findByEmail(email);
      if (!customer) return null;

      // Verify password here (you should use bcrypt or similar)
      // For now, just basic comparison
      if (customer.password_hash === password) {
        await customer.update({ last_login: new Date() });
        return customer;
      }
      return null;
    } catch (error) {
      console.error("Error authenticating customer:", error);
      throw error;
    }
  }

  /**
   * Lấy tất cả customers
   */
  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const query = "SELECT * FROM user_logs.customers LIMIT ?";
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new Customer(row));
    } catch (error) {
      console.error("Error finding all customers:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      status: this.status,
      subscription_plan: this.subscription_plan,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_login: this.last_login,
      settings: this.settings,
    };
  }
}
