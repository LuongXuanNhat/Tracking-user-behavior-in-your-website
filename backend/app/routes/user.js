// routes/user.js
import express from "express";
import { UserAPI } from "../api/userApi.js";

const router = express.Router();

// GET all users
router.get("/", UserAPI.getAllUsers);

// GET user by ID
router.get("/:id", UserAPI.getUserById);

// POST create new user
router.post("/", UserAPI.createUser);

// PUT update user
router.put("/:id", UserAPI.updateUser);

// DELETE user
router.delete("/:id", UserAPI.deleteUser);

export default router;
