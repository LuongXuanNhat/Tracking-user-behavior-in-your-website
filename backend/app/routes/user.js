// routes/user.js
import express from "express";
import { UserAPI } from "../api/userApi.js";
import { requireApiKey, requirePermission } from "../middlewares/apikey.js";

const router = express.Router();

// GET all users - chỉ cần API key
router.get("/", requireApiKey, UserAPI.getAllUsers);

// GET user by ID - chỉ cần API key
router.get("/:id", requireApiKey, UserAPI.getUserById);

// POST create new user - cần API key và permission 'users'
router.post("/", requireApiKey, requirePermission("users"), UserAPI.createUser);

// PUT update user - cần API key và permission 'users'
router.put(
  "/:id",
  requireApiKey,
  requirePermission("users"),
  UserAPI.updateUser
);

// DELETE user - cần API key và permission 'users'
router.delete(
  "/:id",
  requireApiKey,
  requirePermission("users"),
  UserAPI.deleteUser
);

export default router;
