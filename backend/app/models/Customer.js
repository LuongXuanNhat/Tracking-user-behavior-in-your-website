// models/Customer.js
// Model để quản lý customers với Cassandra integration

import cassandraConnection from "../../config/database/init.js";
import { v4 as uuidv4 } from "uuid";
import process from "process";
import dotenv from "dotenv";
dotenv.config();

const KEYSPACE = process.env.CASSANDRA_KEYSPACE;

export class Customer {
  constructor(data = {}) {
    this.customer_id = data.customer_id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.company = data.company || null;
    this.plan = data.plan || "free"; // free, premium, enterprise
    this.status = data.status || "active"; // active, suspended, inactive
    this.settings = data.settings || {};
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.last_login = data.last_login || null;
  }

  /**
   * Tạo customer mới
   */
  async create() {
    try {
      // console.log("Kiểm tra key_log: ", KEYSPACE);
      const client = cassandraConnection.getClient();
      const query = `
        INSERT INTO ${KEYSPACE}.customers (
          customer_id, name, email, company, plan, status,
          settings, created_at, updated_at, last_login
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        this.customer_id,
        this.name,
        this.email,
        this.company,
        this.plan,
        this.status,
        new Map(Object.entries(this.settings)),
        this.created_at,
        this.updated_at,
        this.last_login,
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
      // console.log("Kiểm tra key_log check email: ", KEYSPACE);
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.customers WHERE email = ? ALLOW FILTERING`;
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
  static async findById(customer_id) {
    try {
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.customers WHERE customer_id = ?`;
      const result = await client.execute(query, [customer_id], {
        prepare: true,
      });

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
      if (updateData.company !== undefined) {
        this.company = updateData.company;
        fields.push("company = ?");
        values.push(this.company);
      }
      if (updateData.plan !== undefined) {
        this.plan = updateData.plan;
        fields.push("plan = ?");
        values.push(this.plan);
      }
      if (updateData.status !== undefined) {
        this.status = updateData.status;
        fields.push("status = ?");
        values.push(this.status);
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
      values.push(this.customer_id);

      const query = `UPDATE ${KEYSPACE}.customers SET ${fields.join(
        ", "
      )} WHERE customer_id = ?`;
      await client.execute(query, values, { prepare: true });

      return this;
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  /**
   * Lấy tất cả customers
   */
  static async findAll(limit = 100) {
    try {
      const client = cassandraConnection.getClient();
      const query = `SELECT * FROM ${KEYSPACE}.customers LIMIT ?`;
      const result = await client.execute(query, [limit], { prepare: true });

      return result.rows.map((row) => new Customer(row));
    } catch (error) {
      console.error("Error finding all customers:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      customer_id: this.customer_id,
      name: this.name,
      email: this.email,
      company: this.company,
      plan: this.plan,
      status: this.status,
      settings: this.settings,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_login: this.last_login,
    };
  }
}
