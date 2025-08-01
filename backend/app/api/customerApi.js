// api/customerApi.js
// API endpoints cho quản lý customers

import { Customer } from "../models/Customer.js";
import { Website } from "../models/Website.js";
import { ApiKey } from "../models/ApiKey.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import process from "process";

/**
 * NGHIỆP VỤ 1: ĐĂNG KÝ & QUẢN LÝ KHÁCH HÀNG
 */

/**
 * Đăng ký tài khoản khách hàng mới
 * POST /api/customers/register
 */
export async function registerCustomer(req, res) {
  try {
    const { name, email, password, websiteName, websiteUrl } = req.body;

    // Validation
    if (!name || !email || !password || !websiteName || !websiteUrl) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // Kiểm tra email đã tồn tại
    const existingCustomer = await Customer.findByEmail(email);
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Tạo customer mới
    const customer = new Customer({
      name,
      email,
      password_hash,
      subscription_plan: "free",
    });
    await customer.create();

    // Tạo website đầu tiên
    const website = new Website({
      name: websiteName,
      url: websiteUrl,
      customer_id: customer.id,
      type: "production",
    });
    await website.create();

    // Tạo API key cho website
    const apiKeyString = ApiKey.generateApiKey(websiteName, "production");
    const apiKey = new ApiKey({
      api_key: apiKeyString,
      website_id: website.id,
      website_name: websiteName,
      website_url: websiteUrl,
      type: "production",
      description: "API key chính cho website",
      owner: customer.email,
    });
    await apiKey.create();

    // Generate JWT token
    const token = jwt.sign(
      { customerId: customer.id, email: customer.email },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        customer: customer.toJSON(),
        website: website.toJSON(),
        apiKey: apiKey.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Register customer error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Đăng nhập khách hàng
 * POST /api/customers/login
 */
export async function loginCustomer(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email và password là bắt buộc",
      });
    }

    // Tìm customer
    const customer = await Customer.findByEmail(email);
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc password không đúng",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      customer.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc password không đúng",
      });
    }

    // Update last login
    await customer.update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { customerId: customer.id, email: customer.email },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        customer: customer.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Login customer error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy thông tin profile khách hàng
 * GET /api/customers/profile
 */
export async function getCustomerProfile(req, res) {
  try {
    const customerId = req.customer.customerId;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    // Lấy danh sách websites của customer
    const websites = await Website.findByCustomerId(customerId);

    res.json({
      success: true,
      data: {
        customer: customer.toJSON(),
        websites: websites.map((w) => w.toJSON()),
      },
    });
  } catch (error) {
    console.error("Get customer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Cập nhật thông tin khách hàng
 * PUT /api/customers/profile
 */
export async function updateCustomerProfile(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { name, settings } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (settings !== undefined) updateData.settings = settings;

    await customer.update(updateData);

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: customer.toJSON(),
    });
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Thay đổi password
 * POST /api/customers/change-password
 */
export async function changePassword(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password và new password là bắt buộc",
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      customer.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    // Hash new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await customer.update({ password_hash });

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy danh sách tất cả customers (admin only)
 * GET /api/customers
 */
export async function getAllCustomers(req, res) {
  try {
    const { limit = 100 } = req.query;

    const customers = await Customer.findAll(parseInt(limit));

    res.json({
      success: true,
      data: customers.map((c) => c.toJSON()),
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
