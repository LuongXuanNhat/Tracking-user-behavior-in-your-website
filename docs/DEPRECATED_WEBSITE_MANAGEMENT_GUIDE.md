# 🌐 Website Management System - API Key Guide

## 🎯 TỔng QUAN

Hệ thống quản lý API key cho từng website riêng biệt, cho phép:

- ✅ Tạo API key riêng cho mỗi website
- ✅ Quản lý quyền hạn và trạng thái
- ✅ Theo dõi usage và analytics
- ✅ Regenerate API keys khi cần

## 🔑 CÁC LOẠI API KEY

### 1. **Fixed API Keys** (từ .env)

```bash
PRODUCTION_API_KEY=tracking_api_key_123456789
DEMO_API_KEY=demo_api_key_abcdefg
TEST_API_KEY=test_api_key_xyz
```

### 2. **Website API Keys** (từ database)

Mỗi website có API key riêng được generate và lưu trong database.

---

## 🚀 CÁCH TẠO API KEY CHO WEBSITE MỚI

### Method 1: Sử dụng POST /api/generate-key

```bash
curl -X POST http://localhost:3001/api/generate-key \
  -H "Content-Type: application/json" \
  -d '{
    "website_name": "My Portfolio Website",
    "website_url": "https://myportfolio.com",
    "type": "production",
    "description": "Personal portfolio tracking"
  }'
```

**Response:**

```json
{
  "status": "success",
  "message": "New API key generated for website: My Portfolio Website",
  "data": {
    "website": {
      "id": 4,
      "name": "My Portfolio Website",
      "url": "https://myportfolio.com",
      "api_key": "production_myportfoliowebsite_1642812345678_abc123def456",
      "type": "production",
      "status": "active",
      "created_at": "2025-07-21T10:30:00.000Z"
    },
    "integration_guide": {
      "javascript_integration": "...",
      "curl_example": "...",
      "analytics_example": "..."
    }
  }
}
```

### Method 2: Sử dụng Website API

```bash
curl -X POST http://localhost:3001/api/websites \
  -H "Content-Type: application/json" \
  -H "x-api-key: tracking_api_key_123456789" \
  -d '{
    "name": "E-commerce Store",
    "url": "https://mystore.com",
    "type": "production",
    "description": "Online store tracking"
  }'
```

---

## 📊 QUẢN LÝ WEBSITES

### Lấy danh sách tất cả websites

```bash
curl -H "x-api-key: tracking_api_key_123456789" \
  http://localhost:3001/api/websites
```

### Xem thông tin website cụ thể

```bash
curl -H "x-api-key: tracking_api_key_123456789" \
  http://localhost:3001/api/websites/1
```

### Cập nhật website

```bash
curl -X PUT http://localhost:3001/api/websites/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: tracking_api_key_123456789" \
  -d '{
    "name": "Updated Website Name",
    "description": "Updated description",
    "status": "active"
  }'
```

### Regenerate API key

```bash
curl -X POST http://localhost:3001/api/websites/1/regenerate-key \
  -H "x-api-key: tracking_api_key_123456789"
```

### Xóa website

```bash
curl -X DELETE http://localhost:3001/api/websites/1 \
  -H "x-api-key: tracking_api_key_123456789"
```

### Xem thống kê websites

```bash
curl -H "x-api-key: tracking_api_key_123456789" \
  http://localhost:3001/api/websites/stats
```

---

## 🛠️ TÍCH HỢP VÀO WEBSITE

### 1. Lấy API key cho website của bạn

```bash
# Tạo API key mới
curl -X POST http://localhost:3001/api/generate-key \
  -H "Content-Type: application/json" \
  -d '{
    "website_name": "Your Website",
    "website_url": "https://yourwebsite.com",
    "type": "production"
  }'
```

### 2. Thêm vào HTML của website

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Your existing head content -->

    <!-- Add tracking script -->
    <script src="http://localhost:3001/tracking-script.js"></script>
    <script>
      window.userTrackingConfig = {
        apiUrl: "http://localhost:3001/api/tracking",
        apiKey: "YOUR_GENERATED_API_KEY", // Replace with your actual API key
        enabled: true,
        batchSize: 10,
        batchTimeout: 5000,
      };

      const tracker = new UserTracker(window.userTrackingConfig);
    </script>
  </head>
  <body>
    <!-- Your website content -->
  </body>
</html>
```

### 3. Test tracking hoạt động

```bash
# Check if events are being tracked
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3001/api/tracking/events

# View analytics
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3001/api/analytics/clicks
```

---

## 🔒 BẢO MẬT & PERMISSIONS

### Website API Key Permissions

Mỗi website key có quyền:

- ✅ **tracking**: Gửi tracking events
- ✅ **analytics**: Xem analytics data
- ✅ **users**: Phụ thuộc vào type (demo = false, production = true)

### Kiểm tra quyền hạn

```bash
curl -H "x-api-key: YOUR_WEBSITE_API_KEY" \
  http://localhost:3001/api/validate-key
```

### Rate Limiting

- **Demo**: 100 requests/minute
- **Test**: 1000 requests/minute
- **Production**: 10000 requests/minute

---

## 📈 MONITORING & ANALYTICS

### Theo dõi usage của website

```bash
# Xem thống kê tổng quan
curl -H "x-api-key: tracking_api_key_123456789" \
  http://localhost:3001/api/websites/stats

# Response bao gồm:
{
  "total": 5,
  "active": 4,
  "inactive": 1,
  "by_type": {
    "production": 3,
    "demo": 1,
    "test": 1
  },
  "most_used": [...],
  "recently_created": [...]
}
```

### Xem events của website cụ thể

```bash
curl -H "x-api-key: YOUR_WEBSITE_API_KEY" \
  "http://localhost:3001/api/tracking/events?limit=50"
```

### Analytics cho website

```bash
curl -H "x-api-key: YOUR_WEBSITE_API_KEY" \
  http://localhost:3001/api/analytics/clicks

curl -H "x-api-key: YOUR_WEBSITE_API_KEY" \
  http://localhost:3001/api/analytics/views
```

---

## 🛡️ BEST PRACTICES

### 1. Environment Variables

```bash
# .env file
PRODUCTION_API_KEY=your_production_key
DEMO_API_KEY=your_demo_key
TEST_API_KEY=your_test_key
```

### 2. API Key Security

- ❌ Không hardcode API key trong source code
- ✅ Sử dụng environment variables
- ✅ Rotate API keys định kỳ
- ✅ Monitor usage patterns

### 3. Website Management

- ✅ Tạo API key riêng cho mỗi website/environment
- ✅ Sử dụng descriptive names và descriptions
- ✅ Deactivate unused websites
- ✅ Monitor last_used timestamps

### 4. Development vs Production

```javascript
// Development
const apiKey =
  process.env.NODE_ENV === "development"
    ? "demo_api_key_abcdefg"
    : "your_production_website_key";

// Production
const apiKey = process.env.TRACKING_API_KEY; // From environment
```

---

## 🆘 TROUBLESHOOTING

### "Invalid API key"

1. Check if website is active: `GET /api/websites`
2. Verify API key format
3. Regenerate if needed: `POST /api/websites/:id/regenerate-key`

### "Insufficient permissions"

1. Check website type (demo keys have limited permissions)
2. Upgrade to production key if needed

### Rate limit exceeded

1. Check usage: `GET /api/websites/stats`
2. Upgrade key type or optimize requests

---

## 📝 QUICK REFERENCE

| Endpoint                           | Method | Purpose                      | Auth Required |
| ---------------------------------- | ------ | ---------------------------- | ------------- |
| `/api/keys`                        | GET    | Get fixed API keys           | ❌            |
| `/api/generate-key`                | POST   | Quick website key generation | ❌            |
| `/api/websites`                    | GET    | List all websites            | ✅            |
| `/api/websites`                    | POST   | Create new website           | ✅            |
| `/api/websites/:id`                | GET    | Get website details          | ✅            |
| `/api/websites/:id`                | PUT    | Update website               | ✅            |
| `/api/websites/:id`                | DELETE | Delete website               | ✅            |
| `/api/websites/:id/regenerate-key` | POST   | Regenerate API key           | ✅            |
| `/api/websites/stats`              | GET    | Website statistics           | ✅            |

**🎉 Hệ thống website management hoàn chỉnh! Mỗi website có thể có API key riêng và được quản lý độc lập.**
