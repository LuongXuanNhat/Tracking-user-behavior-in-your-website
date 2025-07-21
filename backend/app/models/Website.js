// models/Website.js
// Model để quản lý websites và API keys

// In-memory storage cho demo (thực tế sẽ dùng database)
let websites = [];
let websiteCounter = 1;

export class Website {
  /**
   * Tạo website mới với API key
   */
  static create(websiteData) {
    const {
      name,
      url,
      api_key,
      type = "production",
      description = "",
      owner = "admin",
    } = websiteData;

    const newWebsite = {
      id: websiteCounter++,
      name,
      url,
      api_key,
      type,
      description,
      owner,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used: null,
      usage_count: 0,
      permissions: {
        tracking: true,
        analytics: true,
        users: type !== "demo",
      },
    };

    websites.push(newWebsite);
    return newWebsite;
  }

  /**
   * Tìm website theo API key
   */
  static findByApiKey(apiKey) {
    return websites.find((website) => website.api_key === apiKey);
  }

  /**
   * Lấy tất cả websites
   */
  static findAll() {
    return websites;
  }

  /**
   * Tìm website theo ID
   */
  static findById(id) {
    return websites.find((website) => website.id === parseInt(id));
  }

  /**
   * Cập nhật website
   */
  static update(id, updateData) {
    const index = websites.findIndex((website) => website.id === parseInt(id));
    if (index === -1) return null;

    websites[index] = {
      ...websites[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    return websites[index];
  }

  /**
   * Xóa website
   */
  static delete(id) {
    const index = websites.findIndex((website) => website.id === parseInt(id));
    if (index === -1) return null;

    return websites.splice(index, 1)[0];
  }

  /**
   * Cập nhật lần sử dụng cuối
   */
  static updateLastUsed(apiKey) {
    const website = this.findByApiKey(apiKey);
    if (website) {
      website.last_used = new Date().toISOString();
      website.usage_count += 1;
    }
    return website;
  }

  /**
   * Tạo API key mới
   */
  static generateApiKey(name, type = "production") {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 12);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${type}_${cleanName}_${timestamp}_${randomString}`;
  }

  /**
   * Kiểm tra API key có hợp lệ và active không
   */
  static validateApiKey(apiKey) {
    const website = this.findByApiKey(apiKey);
    return website && website.status === "active";
  }

  /**
   * Thống kê websites
   */
  static getStats() {
    const total = websites.length;
    const active = websites.filter((w) => w.status === "active").length;
    const byType = websites.reduce((acc, website) => {
      acc[website.type] = (acc[website.type] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      active,
      inactive: total - active,
      by_type: byType,
      most_used: websites
        .filter((w) => w.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 5),
      recently_created: websites
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    };
  }
}

// Thêm một số website mặc định cho demo
Website.create({
  name: "Demo Portfolio",
  url: "https://demo.portfolio.com",
  api_key: "demo_api_key_abcdefg",
  type: "demo",
  description: "Demo website for testing",
  owner: "demo_user",
});

Website.create({
  name: "Production Site",
  url: "https://myproductionsite.com",
  api_key: "tracking_api_key_123456789",
  type: "production",
  description: "Main production website",
  owner: "admin",
});

Website.create({
  name: "Test Environment",
  url: "https://test.mysite.com",
  api_key: "test_api_key_xyz",
  type: "test",
  description: "Testing environment",
  owner: "developer",
});
