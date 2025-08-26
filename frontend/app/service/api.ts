// API configuration and helper functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  customer: any;
  token: string;
}

interface RegisterResponse {
  customer: any;
  website: any;
  token: string;
}

interface CustomerProfileResponse {
  customer: {
    customer_id: string;
    name: string;
    email: string;
    company?: string;
    plan?: string;
    created_at: string;
    last_login?: string;
  };
}

class ApiService {
  // Utility function để decode JWT token
  private static decodeToken(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  // Kiểm tra xem token có hết hạn không
  private static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  }

  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token");

    // Kiểm tra token trước khi sử dụng
    if (token && this.isTokenExpired(token)) {
      this.logout();
      throw new Error("Token đã hết hạn");
    }

    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private static async handleResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      // Xử lý token hết hạn (401 Unauthorized)
      if (response.status === 401) {
        // Xóa token và customer data từ localStorage
        this.logout();

        // Chuyển hướng về trang đăng nhập
        if (typeof window !== "undefined") {
          window.location.href = "/auth";
        }

        throw new Error("Token đã hết hạn");
      }

      throw new Error(data.message || "Có lỗi xảy ra");
    }

    return data;
  }

  // Authentication APIs
  static async login(
    email: string,
    password: string
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/customers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await this.handleResponse<LoginResponse>(response);

    // Store token if login successful
    if (result.success && result.data?.token) {
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("customer", JSON.stringify(result.data.customer));
    }

    return result;
  }

  static async register(data: {
    name: string;
    email: string;
    password: string;
    websiteName: string;
    websiteUrl: string;
  }): Promise<ApiResponse<RegisterResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/customers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<RegisterResponse>(response);

    // Store token if registration successful
    if (result.success && result.data?.token) {
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("customer", JSON.stringify(result.data.customer));
    }

    return result;
  }

  static logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("customer");
  }

  static getStoredCustomer() {
    const customer = localStorage.getItem("customer");
    return customer ? JSON.parse(customer) : null;
  }

  static isAuthenticated(): boolean {
    const token = localStorage.getItem("token");
    if (!token) {
      return false;
    }

    // Kiểm tra xem token có hết hạn không
    if (this.isTokenExpired(token)) {
      this.logout(); // Tự động xóa token hết hạn
      return false;
    }

    return true;
  }

  // Phương thức để xử lý logout khi token hết hạn
  static handleTokenExpired() {
    this.logout();
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  }

  // Phương thức wrapper để thực hiện API call với xử lý token hết hạn
  static async makeAuthenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Token đã hết hạn") {
        // Chuyển hướng về trang đăng nhập
        if (typeof window !== "undefined") {
          window.location.href = "/auth";
        }
        throw error;
      }
      throw error;
    }
  }

  // Website APIs
  static async getWebsites() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/api/websites`, {
      method: "GET",
    });
  }

  static async createWebsite(data: {
    name: string;
    url: string;
    description?: string;
  }) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/api/websites`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async getWebsiteById(websiteId: string) {
    // Validation
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      throw new Error("Website ID không hợp lệ");
    }

    return this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/websites/${websiteId}`,
      {
        method: "GET",
      }
    );
  }

  // Events APIs
  static async getEvents(
    websiteId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("start_date", params.startDate);
    if (params?.endDate) searchParams.append("end_date", params.endDate);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/websites/${websiteId}/events${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Get all events by website with advanced filtering
  static async getAllEventsByWebsite(params: {
    website_id: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    event_type?: string;
    visitor_id?: string;
    session_id?: string;
  }) {
    // Validation
    if (
      !params.website_id ||
      params.website_id === "undefined" ||
      params.website_id === "null"
    ) {
      throw new Error("Website ID không hợp lệ");
    }

    const searchParams = new URLSearchParams();

    // website_id is required
    searchParams.append("website_id", params.website_id);

    // Optional parameters
    if (params.start_date) searchParams.append("start_date", params.start_date);
    if (params.end_date) searchParams.append("end_date", params.end_date);
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.event_type) searchParams.append("event_type", params.event_type);
    if (params.visitor_id) searchParams.append("visitor_id", params.visitor_id);
    if (params.session_id) searchParams.append("session_id", params.session_id);

    const response = await fetch(
      `${API_BASE_URL}/api/websites/getAllEvent?${searchParams.toString()}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse(response);
  }

  static async getEventsByUser(websiteId: string, visitorId: string) {
    return this.getAllEventsByWebsite({
      website_id: websiteId,
      visitor_id: visitorId,
    });
  }

  static async getEventsBySession(websiteId: string, sessionId: string) {
    return this.getAllEventsByWebsite({
      website_id: websiteId,
      session_id: sessionId,
    });
  }

  // Get tracking code for a website
  static async getTrackingCode(websiteId: string) {
    // Validation
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      throw new Error("Website ID không hợp lệ");
    }

    const response = await fetch(
      `${API_BASE_URL}/api/websites/${websiteId}/tracking-code`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse(response);
  }

  // Update website
  static async updateWebsite(
    websiteId: string,
    data: {
      name?: string;
      url?: string;
      description?: string;
      status?: string;
      tracking_settings?: any;
    }
  ) {
    // Validation
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      throw new Error("Website ID không hợp lệ");
    }

    const response = await fetch(`${API_BASE_URL}/api/websites/${websiteId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // Delete website
  static async deleteWebsite(websiteId: string) {
    // Validation
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      throw new Error("Website ID không hợp lệ");
    }
    const response = await fetch(`${API_BASE_URL}/api/websites/${websiteId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Get website statistics
  static async getWebsiteStats() {
    const response = await fetch(`${API_BASE_URL}/api/websites/stats`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Customer profile APIs
  static async getCustomerProfile() {
    return this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/customers/profile`,
      {
        method: "GET",
      }
    );
  }

  static async updateCustomerProfile(data: {
    name?: string;
    company?: string;
  }) {
    return this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/customers/profile`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  static async changePassword(data: {
    current_password: string;
    new_password: string;
  }) {
    const response = await fetch(
      `${API_BASE_URL}/api/customers/change-password`,
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse(response);
  }

  // Tracking APIs
  static async getEventsByDateRange(
    websiteId: string,
    startDate: string,
    endDate: string,
    limit?: number
  ) {
    return this.getAllEventsByWebsite({
      website_id: websiteId,
      start_date: startDate,
      end_date: endDate,
      limit: limit,
    });
  }

  static async getEventsByType(
    websiteId: string,
    eventType: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ) {
    return this.getAllEventsByWebsite({
      website_id: websiteId,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      limit: limit,
    });
  }
}

export default ApiService;
