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

class ApiService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token");
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
    return !!localStorage.getItem("token");
  }

  // Website APIs
  static async getWebsites() {
    const response = await fetch(`${API_BASE_URL}/api/websites`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async createWebsite(data: {
    name: string;
    url: string;
    description?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/websites`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async getWebsiteById(websiteId: string) {
    // Validation
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      throw new Error("Website ID không hợp lệ");
    }

    const response = await fetch(`${API_BASE_URL}/api/websites/${websiteId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
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
    const response = await fetch(`${API_BASE_URL}/api/customers/profile`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async updateCustomerProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/customers/profile`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
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
