// routes/user.js
// Routes cho user/visitor management

import express from "express";
import {
  createUser,
  getUsers,
  getUser,
  getUserByEmail,
  updateUser,
  deleteUser,
  getUserActivities,
  getUserStats,
} from "../api/userApi.js";

const router = express.Router();

// Public routes for user creation
router.post("/", createUser);

// Protected routes (thêm authentication middleware nếu cần)
router.get("/", getUsers);
router.get("/by-email/:email", getUserByEmail);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/:id/activities", getUserActivities);
router.get("/:id/stats", getUserStats);

export default router;
