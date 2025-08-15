// services/socketService.js
// Socket.IO service để quản lý realtime events

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import process from "process";
import { Customer } from "../models/Customer.js";
import { Website } from "../models/Website.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> {socketId, websites: []}
    this.websiteSubscriptions = new Map(); // websiteId -> Set of userIds
  }

  /**
   * Initialize Socket.IO server
   */
  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log("Socket.IO server initialized");
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        console.log("JWT_SECRET in socketService:", process.env.JWT_SECRET);
        console.log("Token received:", token);

        // Verify JWT token with same secret as customerApi
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default_secret"
        );
        console.log("Decoded JWT:", decoded);

        // Get customer data - JWT contains customerId, not userId
        const customer = await Customer.findById(decoded.customerId);
        if (!customer) {
          return next(new Error("Authentication error: Customer not found"));
        }

        // Attach customer to socket
        socket.userId = customer.customer_id;
        socket.userEmail = customer.email;

        next();
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication error"));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(
        `User ${socket.userEmail} connected with socket ${socket.id}`
      );

      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        websites: [],
      });

      // Handle website subscription
      socket.on("subscribe_website", async (websiteId) => {
        try {
          // Check if customer has access to this website
          const hasAccess = await this.checkWebsiteAccess(
            socket.userId,
            websiteId
          );

          if (hasAccess) {
            // Add user to website subscription
            if (!this.websiteSubscriptions.has(websiteId)) {
              this.websiteSubscriptions.set(websiteId, new Set());
            }
            this.websiteSubscriptions.get(websiteId).add(socket.userId);

            // Update user's subscribed websites
            const userConnection = this.connectedUsers.get(socket.userId);
            if (
              userConnection &&
              !userConnection.websites.includes(websiteId)
            ) {
              userConnection.websites.push(websiteId);
            }

            // Join socket room for this website
            socket.join(`website_${websiteId}`);

            socket.emit("subscription_success", { websiteId });
            console.log(
              `User ${socket.userEmail} subscribed to website ${websiteId}`
            );
          } else {
            socket.emit("subscription_error", {
              websiteId,
              message: "Access denied to this website",
            });
          }
        } catch (error) {
          console.error("Error subscribing to website:", error);
          socket.emit("subscription_error", {
            websiteId,
            message: "Failed to subscribe to website",
          });
        }
      });

      // Handle website unsubscription
      socket.on("unsubscribe_website", (websiteId) => {
        try {
          // Remove user from website subscription
          if (this.websiteSubscriptions.has(websiteId)) {
            this.websiteSubscriptions.get(websiteId).delete(socket.userId);

            // Clean up empty subscriptions
            if (this.websiteSubscriptions.get(websiteId).size === 0) {
              this.websiteSubscriptions.delete(websiteId);
            }
          }

          // Update user's subscribed websites
          const userConnection = this.connectedUsers.get(socket.userId);
          if (userConnection) {
            userConnection.websites = userConnection.websites.filter(
              (id) => id !== websiteId
            );
          }

          // Leave socket room
          socket.leave(`website_${websiteId}`);

          socket.emit("unsubscription_success", { websiteId });
          console.log(
            `User ${socket.userEmail} unsubscribed from website ${websiteId}`
          );
        } catch (error) {
          console.error("Error unsubscribing from website:", error);
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User ${socket.userEmail} disconnected`);

        // Clean up user connection
        const userConnection = this.connectedUsers.get(socket.userId);
        if (userConnection) {
          // Remove user from all website subscriptions
          userConnection.websites.forEach((websiteId) => {
            if (this.websiteSubscriptions.has(websiteId)) {
              this.websiteSubscriptions.get(websiteId).delete(socket.userId);

              // Clean up empty subscriptions
              if (this.websiteSubscriptions.get(websiteId).size === 0) {
                this.websiteSubscriptions.delete(websiteId);
              }
            }
          });
        }

        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  /**
   * Check if customer has access to website
   */
  async checkWebsiteAccess(customerId, websiteId) {
    try {
      // Get customer's websites using customer_id
      const websites = await Website.findByCustomerId(customerId);
      return websites.some(
        (website) => website.website_id.toString() === websiteId
      );
    } catch (error) {
      console.error("Error checking website access:", error);
      return false;
    }
  }

  /**
   * Broadcast new event to subscribed users and website owner
   */
  async broadcastNewEvent(websiteId, event) {
    try {
      console.log(`🔔 Attempting to broadcast event for website: ${websiteId}`);
      console.log(
        `Current subscriptions:`,
        Array.from(this.websiteSubscriptions.keys())
      );

      // Kiểm tra xem Socket.IO đã được khởi tạo chưa
      if (!this.io) {
        console.error(
          "❌ IO not initialized - Socket.IO server chưa được khởi tạo"
        );
        return;
      }

      // Tạo event payload
      const eventPayload = {
        websiteId,
        event: {
          event_id: event.event_id,
          event_type: event.event_type,
          event_name: event.event_name,
          page_url: event.page_url,
          page_title: event.page_title,
          visitor_id: event.visitor_id,
          session_id: event.session_id,
          user_id: event.user_id,
          event_time: event.event_time,
          device_type: event.device_type,
          browser: event.browser,
          os: event.os,
          country: event.country,
          city: event.city,
          referrer: event.referrer,
          utm_source: event.utm_source,
          utm_medium: event.utm_medium,
          utm_campaign: event.utm_campaign,
          element_selector: event.element_selector,
          element_text: event.element_text,
          properties: event.properties,
        },
      };

      let broadcastCount = 0;

      // 1. Broadcast cho các users đã subscribe website này
      if (this.websiteSubscriptions.has(websiteId)) {
        const subscribedUsers = this.websiteSubscriptions.get(websiteId);
        console.log(
          `📡 Broadcasting to ${subscribedUsers.size} subscribed users for website ${websiteId}`
        );

        this.io.to(`website_${websiteId}`).emit("new_event", eventPayload);
        broadcastCount += subscribedUsers.size;
      }

      // 2. Luôn luôn broadcast cho chủ sở hữu website (nếu đang online)
      try {
        const website = await Website.findById(websiteId);
        if (website && website.customer_id) {
          const ownerId = website.customer_id;
          console.log(`👤 Website owner ID: ${ownerId}`);

          // Kiểm tra xem owner có đang online không
          const ownerConnection = this.connectedUsers.get(ownerId);
          if (ownerConnection) {
            // Kiểm tra xem owner đã subscribe chưa để tránh duplicate
            const isAlreadySubscribed =
              this.websiteSubscriptions.has(websiteId) &&
              this.websiteSubscriptions.get(websiteId).has(ownerId);

            if (!isAlreadySubscribed) {
              // Gửi trực tiếp cho owner socket
              this.io
                .to(ownerConnection.socketId)
                .emit("new_event", eventPayload);
              broadcastCount++;
              console.log(
                `✅ Broadcasted to website owner (${ownerId}) - socket: ${ownerConnection.socketId}`
              );
            } else {
              console.log(
                `ℹ️  Website owner already subscribed, no duplicate broadcast needed`
              );
            }
          } else {
            console.log(`ℹ️  Website owner (${ownerId}) is not online`);
          }
        } else {
          console.log(
            `⚠️  Could not find website or owner for websiteId: ${websiteId}`
          );
        }
      } catch (ownerError) {
        console.error(`❌ Error finding website owner:`, ownerError);
      }

      // 3. TODO: Broadcast cho admin (có thể implement sau)
      // await this.broadcastToAdmins(eventPayload);

      console.log(
        `✅ Broadcasted event ${event.event_id} for website ${websiteId} to ${broadcastCount} total recipients`
      );

      if (broadcastCount === 0) {
        console.log(`⚠️  No active recipients found for website ${websiteId}`);
      }
    } catch (error) {
      console.error("❌ Error broadcasting event:", error);
    }
  }

  /**
   * Check if Socket.IO is initialized
   */
  isInitialized() {
    return this.io !== null;
  }

  /**
   * Get detailed connection information for debugging
   */
  getConnectionInfo() {
    return {
      isInitialized: this.isInitialized(),
      connectedUsers: Array.from(this.connectedUsers.entries()).map(
        ([userId, info]) => ({
          userId,
          socketId: info.socketId,
          subscribedWebsites: info.websites,
        })
      ),
      websiteSubscriptions: Array.from(this.websiteSubscriptions.entries()).map(
        ([websiteId, users]) => ({
          websiteId,
          subscribedUserIds: Array.from(users),
          subscribedCount: users.size,
        })
      ),
    };
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      websiteSubscriptions: Array.from(this.websiteSubscriptions.entries()).map(
        ([websiteId, users]) => ({
          websiteId,
          subscribedUsers: users.size,
        })
      ),
    };
  }
}

// Export singleton instance
export default new SocketService();
