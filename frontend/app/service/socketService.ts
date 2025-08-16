// service/socketService.ts
// Socket.IO client service cho realtime events

import { io, Socket } from "socket.io-client";

export interface RealtimeEvent {
  event_id: string;
  event_type: string;
  event_name: string;
  page_url: string;
  page_title?: string;
  visitor_id: string;
  session_id: string;
  user_id?: string;
  event_time: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  element_selector?: string;
  element_text?: string;
  properties?: Record<string, any>;
}

export interface SocketEventCallbacks {
  onNewEvent?: (data: { websiteId: string; event: RealtimeEvent }) => void;
  onSubscriptionSuccess?: (data: { websiteId: string }) => void;
  onSubscriptionError?: (data: { websiteId: string; message: string }) => void;
  onUnsubscriptionSuccess?: (data: { websiteId: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private subscribedWebsites: Set<string> = new Set();
  private callbacks: SocketEventCallbacks = {};

  /**
   * Initialize socket connection
   */
  init(token: string, serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.token = token;

        const url =
          serverUrl ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:3002";

        this.socket = io(url, {
          auth: {
            token: token,
          },
          transports: ["websocket", "polling"],
          timeout: 10000,
        });

        this.setupEventHandlers();

        this.socket.on("connect", () => {
          console.log("Socket connected successfully");
          this.callbacks.onConnect?.();
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          this.callbacks.onError?.(error);
          reject(error);
        });
      } catch (error) {
        console.error("Error initializing socket:", error);
        reject(error);
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    // Handle new events
    this.socket.on(
      "new_event",
      (data: { websiteId: string; event: RealtimeEvent }) => {
        console.log("Received new event:", data);
        this.callbacks.onNewEvent?.(data);
      }
    );

    // Handle subscription success
    this.socket.on("subscription_success", (data: { websiteId: string }) => {
      console.log("Subscription successful:", data);
      this.subscribedWebsites.add(data.websiteId);
      this.callbacks.onSubscriptionSuccess?.(data);
    });

    // Handle subscription error
    this.socket.on(
      "subscription_error",
      (data: { websiteId: string; message: string }) => {
        console.error("Subscription error:", data);
        this.callbacks.onSubscriptionError?.(data);
      }
    );

    // Handle unsubscription success
    this.socket.on("unsubscription_success", (data: { websiteId: string }) => {
      console.log("Unsubscription successful:", data);
      this.subscribedWebsites.delete(data.websiteId);
      this.callbacks.onUnsubscriptionSuccess?.(data);
    });

    // Handle disconnect
    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.subscribedWebsites.clear();
      this.callbacks.onDisconnect?.();
    });

    // Handle errors
    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.callbacks.onError?.(error);
    });
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: SocketEventCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Subscribe to website events
   */
  subscribeToWebsite(websiteId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      if (this.subscribedWebsites.has(websiteId)) {
        resolve(); // Already subscribed
        return;
      }

      // Set up one-time listeners for this subscription
      const onSuccess = (data: { websiteId: string }) => {
        if (data.websiteId === websiteId) {
          this.socket?.off("subscription_success", onSuccess);
          this.socket?.off("subscription_error", onError);
          resolve();
        }
      };

      const onError = (data: { websiteId: string; message: string }) => {
        if (data.websiteId === websiteId) {
          this.socket?.off("subscription_success", onSuccess);
          this.socket?.off("subscription_error", onError);
          reject(new Error(data.message));
        }
      };

      this.socket.on("subscription_success", onSuccess);
      this.socket.on("subscription_error", onError);

      // Send subscription request
      this.socket.emit("subscribe_website", websiteId);
    });
  }

  /**
   * Unsubscribe from website events
   */
  unsubscribeFromWebsite(websiteId: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.emit("unsubscribe_website", websiteId);
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.subscribedWebsites.clear();
      this.callbacks = {};
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get subscribed websites
   */
  getSubscribedWebsites(): string[] {
    return Array.from(this.subscribedWebsites);
  }

  /**
   * Check if subscribed to website
   */
  isSubscribedToWebsite(websiteId: string): boolean {
    return this.subscribedWebsites.has(websiteId);
  }
}

// Export singleton instance
export default new SocketService();
