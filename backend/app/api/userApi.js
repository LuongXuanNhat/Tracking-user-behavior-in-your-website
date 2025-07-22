// api/userApi.js
// Logic xử lý API cho users

import { User } from "../models/User.js";

export class UserAPI {
  /**
   * Lấy tất cả users
   */
  static async getAllUsers(req, res) {
    try {
      const users = await User.findAll();

      res.json({
        status: "success",
        data: users.map((user) => user.toJSON()),
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
   * Lấy user theo ID
   */
  static async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        data: user.toJSON(),
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
   * Tạo user mới
   */
  static async createUser(req, res) {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          status: "error",
          message: "Name and email are required",
        });
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "Email already exists",
        });
      }

      const newUser = await User.create({ name, email });

      res.status(201).json({
        status: "success",
        data: newUser.toJSON(),
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
   * Cập nhật user
   */
  static async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const { name, email } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Check if email already exists (for other users)
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            status: "error",
            message: "Email already exists",
          });
        }
      }

      // Update user
      const updatedUser = await user.update({ name, email });

      res.json({
        status: "success",
        data: updatedUser.toJSON(),
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
   * Xóa user
   */
  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      await user.delete();

      res.json({
        status: "success",
        message: "User deleted successfully",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}
