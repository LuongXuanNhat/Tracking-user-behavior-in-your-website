// api/websiteApi.js
// API endpoints cho quản lý websites

import { Website } from "../models/Website.js";
import { ApiKey } from "../models/ApiKey.js";
import { Customer } from "../models/Customer.js";
import process from "process";

/**
 * NGHIỆP VỤ 1: ĐĂNG KÝ & QUẢN LÝ WEBSITES
 */

/**
 * Tạo website mới
 * POST /api/websites
 */
export async function createWebsite(req, res) {
  try {
    const customerId = req.customer.customerId;
    console.log("Creating website for customer:", req.customer);
    const { name, url, type = "production", description = "" } = req.body;

    // Validation
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: "Tên website và URL là bắt buộc",
      });
    }

    // Kiểm tra customer tồn tại
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    const apiKeyString = ApiKey.generateApiKey(name, type);
    // Tạo website mới
    const website = new Website({
      name,
      url,
      customer_id: customerId,
      type,
      description,
      api_key: apiKeyString,
    });
    await website.create();

    res.status(201).json({
      success: true,
      message: "Tạo website thành công",
      data: {
        website: website.toJSON(),
      },
    });
  } catch (error) {
    console.error("Create website error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy danh sách websites của customer
 * GET /api/websites
 */
export async function getWebsites(req, res) {
  try {
    const customerId = req.customer.customerId;

    const websites = await Website.findByCustomerId(customerId);

    res.json({
      success: true,
      data: websites,
    });
  } catch (error) {
    console.error("Get websites error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy thông tin một website cụ thể
 * GET /api/websites/:id
 */
export async function getWebsite(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy website",
      });
    }

    // Kiểm tra quyền sở hữu

    if (website.customer_id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Lấy API keys

    res.json({
      success: true,
      data: {
        ...website.toJSON(),
      },
    });
  } catch (error) {
    console.error("Get website error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Cập nhật website
 * PUT /api/websites/:id
 */
export async function updateWebsite(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;
    const { name, url, description, status, tracking_settings } = req.body;

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy website",
      });
    }

    // Kiểm tra quyền sở hữu
    if (website.customer_id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (tracking_settings !== undefined)
      updateData.tracking_settings = tracking_settings;

    await website.update(updateData);

    res.json({
      success: true,
      message: "Cập nhật website thành công",
      data: website.toJSON(),
    });
  } catch (error) {
    console.error("Update website error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Xóa website
 * DELETE /api/websites/:id
 */
export async function deleteWebsite(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy website",
      });
    }

    // Kiểm tra quyền sở hữu
    if (website.customer_id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    // Xóa tất cả API keys liên quan

    // Xóa website
    await website.delete();

    res.json({
      success: true,
      message: "Xóa website thành công",
    });
  } catch (error) {
    console.error("Delete website error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Lấy JavaScript tracking code
 * GET /api/websites/:id/tracking-code
 */
export async function getTrackingCode(req, res) {
  try {
    const customerId = req.customer.customerId;
    const { id } = req.params;

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy website",
      });
    }

    // Kiểm tra quyền sở hữu
    if (website.customer_id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập website này",
      });
    }

    const trackingCode = `
<!-- User Behavior Tracking Code -->
<script>
(function() {
  window.UserTracker = {
    apiKey: "${website.api_key}",
    apiUrl: "${
      process.env.API_URL || "http://localhost:3000"
    }/api/tracking/events",
    
    init: function() {
      this.trackPageView();
      this.bindEvents();
    },
    
    trackPageView: function() {
      this.track('page_view', {
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer
      });
    },
    
    track: function(eventType, data) {
      const payload = {
        event_type: eventType,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        session_id: this.getSessionId(),
        ...data
      };
      
      fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(payload)
      }).catch(function(error) {
        console.warn('Tracking error:', error);
      });
    },
    
    bindEvents: function() {
      document.addEventListener('click', function(event) {
        UserTracker.track('click', {
          element_type: event.target.tagName.toLowerCase(),
          element_id: event.target.id || null,
          element_text: event.target.textContent ? event.target.textContent.substring(0, 100) : null
        });
      });
    },
    
    getSessionId: function() {
      let sessionId = sessionStorage.getItem('tracker_session_id');
      if (!sessionId) {
        sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('tracker_session_id', sessionId);
      }
      return sessionId;
    }
  };
  
  // Auto initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.UserTracker.init();
    });
  } else {
    window.UserTracker.init();
  }
})();
</script>
<!-- End User Behavior Tracking Code -->
    `.trim();

    res.json({
      success: true,
      data: {
        trackingCode,
        apiKey: website.api_key,
        websiteName: website.name,
      },
    });
  } catch (error) {
    console.error("Get tracking code error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}

/**
 * Thống kê websites
 * GET /api/websites/stats
 */
export async function getWebsiteStats(req, res) {
  try {
    const stats = await Website.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get website stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
}
