// middlewares/authenticateCustomer.js
// Middleware xác thực customer bằng JWT token

import jwt from "jsonwebtoken";
import { Customer } from "../models/Customer.js";
import process from "process";

/**
 * Middleware xác thực customer đã đăng nhập
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token xác thực là bắt buộc",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );
    // console.log("Decoded token:", decoded);
    // Lấy thông tin customer
    const customer = await Customer.findById(decoded.customerId);
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    if (customer.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    // Attach customer info to request
    req.customer = {
      customerId: customer.customer_id,
      email: customer.email,
      name: customer.name,
      plan: customer.plan,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token đã hết hạn",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xác thực",
      error: error.message,
    });
  }
}

/**
 * Middleware kiểm tra subscription plan
 */
export function requireSubscriptionPlan(requiredPlan) {
  const planLevels = {
    free: 1,
    basic: 2,
    premium: 3,
    enterprise: 4,
  };

  return (req, res, next) => {
    const customerPlan = req.customer.plan;
    const customerLevel = planLevels[customerPlan] || 0;
    const requiredLevel = planLevels[requiredPlan] || 0;

    if (customerLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Cần gói ${requiredPlan} để sử dụng tính năng này`,
        current_plan: customerPlan,
        required_plan: requiredPlan,
      });
    }

    next();
  };
}
