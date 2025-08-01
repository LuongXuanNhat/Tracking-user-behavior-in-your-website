// routes/customer.js
// Routes cho customer management

import express from "express";
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  changePassword,
  getAllCustomers,
} from "../api/customerApi.js";
import { authenticateCustomer } from "../middlewares/authenticateCustomer.js";

const router = express.Router();

// Public routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

// Protected routes
router.get("/profile", authenticateCustomer, getCustomerProfile);
router.put("/profile", authenticateCustomer, updateCustomerProfile);
router.post("/change-password", authenticateCustomer, changePassword);

// Admin routes (TODO: add admin middleware)
router.get("/", getAllCustomers);

export default router;
