// api/userApi.js
// Logic xử lý API cho users

// Sample users data
let users = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    created_at: new Date().toISOString(),
  },
];

let userCounter = 3;

export class UserAPI {
  /**
   * Lấy tất cả users
   */
  static async getAllUsers(req, res) {
    try {
      res.json({
        status: "success",
        data: users,
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
      const userId = parseInt(req.params.id);
      const user = users.find((u) => u.id === userId);

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        data: user,
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
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "Email already exists",
        });
      }

      const newUser = {
        id: userCounter++,
        name,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      users.push(newUser);

      res.status(201).json({
        status: "success",
        data: newUser,
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
      const userId = parseInt(req.params.id);
      const { name, email } = req.body;

      const userIndex = users.findIndex((u) => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Check if email already exists (for other users)
      if (email) {
        const existingUser = users.find(
          (u) => u.email === email && u.id !== userId
        );
        if (existingUser) {
          return res.status(400).json({
            status: "error",
            message: "Email already exists",
          });
        }
      }

      // Update user
      if (name) users[userIndex].name = name;
      if (email) users[userIndex].email = email;
      users[userIndex].updated_at = new Date().toISOString();

      res.json({
        status: "success",
        data: users[userIndex],
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
      const userId = parseInt(req.params.id);
      const userIndex = users.findIndex((u) => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const deletedUser = users.splice(userIndex, 1)[0];

      res.json({
        status: "success",
        message: "User deleted successfully",
        data: deletedUser,
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
