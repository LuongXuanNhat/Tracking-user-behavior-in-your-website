# User Behavior Tracking System

Hệ thống theo dõi hành vi người dùng trên website sử dụng Node.js, Express và Cassandra.

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js (v16 trở lên)
- Cassandra (v4.1 trở lên)
- Docker (tùy chọn)

### 🎯 Cách chạy đơn giản

#### Bước 1: Clone project

```bash
git clone <repository-url>
cd Tracking-user-behavior-in-your-website
```

#### Bước 2: Cài đặt dependencies

```bash
npm install
```

#### Bước 3: Khởi động Cassandra

```bash
# Sử dụng Docker
docker-compose up -d

# Hoặc khởi động Cassandra local
cassandra -f
```

#### Bước 4: Tạo database schema

```bash
# Kết nối vào Cassandra
cqlsh

# Chạy setup script
SOURCE 'cassandra/setup-database.cql';
```

#### Bước 5: Khởi động Backend API

```bash
node server.js
# Backend API sẽ chạy tại http://localhost:3001
```

## 🏗️ Cấu trúc Backend

```
backend/
├── app.js                 # File ứng dụng chính
├── config/
│   └── database/
│       └── init.js        # Cấu hình kết nối Cassandra
├── app/
│   ├── api/              # Bộ điều khiển API
│   │   ├── userApi.js    # API quản lý người dùng
│   │   ├── websiteApi.js # API quản lý website
│   │   ├── apiKeyApi.js  # API quản lý khóa API
│   │   ├── trackingApi.js # API theo dõi sự kiện
│   │   └── analyticsApi.js # API phân tích dữ liệu
│   ├── models/           # Mô hình dữ liệu
│   │   ├── User.js       # Model người dùng
│   │   ├── Website.js    # Model website
│   │   └── ApiKey.js     # Model khóa API
│   ├── routes/           # Định tuyến Express
│   │   ├── user.js       # Routes người dùng
│   │   ├── website.js    # Routes website
│   │   ├── apikey.js     # Routes khóa API
│   │   ├── tracking.js   # Routes theo dõi
│   │   └── analytics.js  # Routes phân tích
│   └── middlewares/      # Middleware Express
│       ├── authenticate.js # Xác thực người dùng
│       └── apikey.js     # Xác thực khóa API
├── server.js             # Điểm khởi động server
└── package.json          # Cấu hình dự án và dependencies
```

## 📊 Database Schema (Cassandra)

### Keyspace: user_logs

- **users**: Thông tin người dùng
- **websites**: Thông tin website đăng ký
- **api_keys**: API keys cho authentication
- **events_by_date**: Events được partition theo ngày
- **user_events**: Events được partition theo user_id

## 🧪 Cách chạy với Postman

### Bước 1: Import Collection

1. Mở Postman
2. Import collection từ file `postman_collection.json` (nếu có)
3. Hoặc tạo requests theo hướng dẫn bên dưới

### Bước 2: Thiết lập Environment

```json
{
  "BASE_URL": "http://localhost:3001",
  "API_KEY": "your_key"
}
```

## � Tạo API Key đầu tiên

### ⚠️ Vấn đề API KEY: "Làm sao tạo API key khi chưa có API key?"

Để giải quyết vấn đề này, hệ thống cung cấp cách tạo API key đầu tiên:

### 🎯 Tạo Key Bằng Tool

```bash
# Tạo API key
node tools/api-key-manager.js create --name "Nhut Thi Beauty" --url "https://nhuthibeauty.com" --description "API key for beauty website"

# Liệt kê API keys
node tools/api-key-manager.js list

# Vô hiệu hóa API key
node tools/api-key-manager.js disable --key "your-api-key-here"

# Xem thông tin chi tiết key
node tools/api-key-manager.js info --key "your-api-key-here"
```

## �📚 API Documentation

### 🔑 Authentication

Tất cả API requests cần header:

```
X-API-Key: your-api-key-here
```

### 👥 User APIs

#### 1. Lấy tất cả users

```http
GET {{BASE_URL}}/api/users
Headers: X-API-Key: {{API_KEY}}
```

#### 2. Lấy user theo ID

```http
GET {{BASE_URL}}/api/users/:id
Headers: X-API-Key: {{API_KEY}}
```

#### 3. Tạo user mới

```http
POST {{BASE_URL}}/api/users
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "name": "Test User",
  "email": "test@example.com"
}
```

#### 4. Cập nhật user

```http
PUT {{BASE_URL}}/api/users/:id
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### 5. Xóa user

```http
DELETE {{BASE_URL}}/api/users/:id
Headers: X-API-Key: {{API_KEY}}
```

### 🌐 Website APIs

#### 1. Lấy tất cả websites

```http
GET {{BASE_URL}}/api/websites
Headers: X-API-Key: {{API_KEY}}
```

#### 2. Tạo website mới

```http
POST {{BASE_URL}}/api/websites
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "name": "My Website",
  "url": "https://example.com",
  "type": "production",
  "description": "Website description"
}
```

#### 3. Lấy thông tin website theo ID

```http
GET {{BASE_URL}}/api/websites/:id
Headers: X-API-Key: {{API_KEY}}
```

#### 4. Cập nhật website

```http
PUT {{BASE_URL}}/api/websites/:id
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "name": "Updated Website Name",
  "url": "https://updated-example.com",
  "status": "active"
}
```

#### 5. Xóa website

```http
DELETE {{BASE_URL}}/api/websites/:id
Headers: X-API-Key: {{API_KEY}}
```

#### 6. Regenerate API key cho website

```http
POST {{BASE_URL}}/api/websites/:id/regenerate-key
Headers: X-API-Key: {{API_KEY}}
```

#### 7. Lấy thống kê websites

```http
GET {{BASE_URL}}/api/websites/stats
Headers: X-API-Key: {{API_KEY}}
```

### 🔐 API Key APIs

#### ⚠️ Lưu ý quan trọng:

- **Tạo API key đầu tiên**: Sử dụng các phương pháp trong phần [🔑 Tạo API Key đầu tiên](#-tạo-api-key-đầu-tiên)
- **Tạo API key tiếp theo**: Sử dụng API endpoint với key đã có

#### 1. Tạo API key mới (Cần có API key hiện tại)

```http
POST {{BASE_URL}}/api/apikeys
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "websiteName": "My Website",
  "websiteUrl": "https://example.com",
  "type": "production",
  "description": "API key for production use"
}
```

#### 2. Lấy danh sách API keys

```http
GET {{BASE_URL}}/api/apikeys
Headers: X-API-Key: {{API_KEY}}
```

#### 3. Lấy thông tin chi tiết API key

```http
GET {{BASE_URL}}/api/apikeys/:id
Headers: X-API-Key: {{API_KEY}}
```

#### 4. Vô hiệu hóa API key

```http
PUT {{BASE_URL}}/api/apikeys/:id/disable
Headers: X-API-Key: {{API_KEY}}
```

#### 5. Gia hạn API key

```http
PUT {{BASE_URL}}/api/apikeys/:id/extend
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body:
{
  "days": 30
}
```

### 📊 Tracking APIs

#### ⚠️ Lưu ý quan trọng:

- **Tracking Events**: Được gửi tự động từ website qua JavaScript
- **Dữ liệu được lưu**: Tự động vào cả `user_events` và `events_by_date` tables trong Cassandra
- **Analytics**: Lấy dữ liệu từ Cassandra để phân tích

#### 🌐 Tích hợp Tracking vào Website

##### Bước 1: Thêm Tracking Script vào HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Your Website</title>
    <!-- Load tracking script -->
    <script src="tracking-script.js"></script>
  </head>
  <body>
    <!-- Your website content -->

    <!-- Initialize tracking -->
    <script>
      window.userTrackingConfig = {
        apiUrl: "http://localhost:3001/api/tracking",
        apiKey: "your-api-key-here", // Thay bằng API key thật
        enabled: true,
        debug: true, // Bật debug mode khi development
        userId: null, // Sẽ tự tạo nếu không có
        autoTrack: true, // Tự động track clicks, scrolls, views
        batchSize: 5,
        batchTimeout: 3000,
      };

      const tracker = new UserTracker(window.userTrackingConfig);
    </script>
  </body>
</html>
```

##### Bước 2: Tracking Script tự động theo dõi:

- ✅ **Page Views**: Khi người dùng vào trang
- ✅ **Clicks**: Mọi click trên website
- ✅ **Scrolling**: Độ sâu cuộn trang
- ✅ **Hovers**: Hover trên elements quan trọng
- ✅ **Page Load**: Khi trang được tải

##### Bước 3: Đánh dấu Elements quan trọng

```html
<!-- Tự động phát hiện element type -->
<button class="service">Dịch vụ A</button>
<article class="blog">Bài viết blog</article>
<div class="review">Đánh giá khách hàng</div>

<!-- Hoặc đánh dấu thủ công -->
<div data-track-type="service" data-service="premium">Dịch vụ Premium</div>
```

#### 🔧 API Endpoints (Được gọi tự động từ JavaScript)

#### 1. API nhận tracking events (Tự động từ website)

```http
POST {{BASE_URL}}/api/tracking/event
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body: (Được gửi tự động từ JavaScript)
{
  "user_id": "user_1753167965051_abc123",
  "event_type": "click",
  "element_type": "button",
  "page_url": "https://nhuthibeauty.com/services",
  "element_id": "service-booking-btn",
  "metadata": {
    "sessionId": "session_1753167965051_def456",
    "coordinates": { "x": 120, "y": 350 },
    "text": "Đặt lịch ngay"
  }
}
```

#### 2. API nhận nhiều events cùng lúc (Batch)

```http
POST {{BASE_URL}}/api/tracking/batch
Headers:
  Content-Type: application/json
  X-API-Key: {{API_KEY}}
Body: (Được gửi tự động từ JavaScript)
{
  "events": [
    {
      "user_id": "user_123",
      "event_type": "view",
      "element_type": "page",
      "page_url": "https://nhuthibeauty.com"
    },
    {
      "user_id": "user_123",
      "event_type": "click",
      "element_type": "service",
      "page_url": "https://nhuthibeauty.com"
    }
  ]
}
```

#### 3. Lấy events của user cụ thể

```http
GET {{BASE_URL}}/api/tracking/user/:user_id/events
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  - event_type: click|view|scroll|hover|load
```

#### 3. Lấy events của user cụ thể

```http
GET {{BASE_URL}}/api/tracking/user/:user_id/events
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  - event_type: click|view|scroll|hover|load
```

#### 4. Lấy events theo ngày hoặc user

```http
GET {{BASE_URL}}/api/tracking/events
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - date: YYYY-MM-DD (hoặc user_id - một trong hai bắt buộc)
  - user_id: user_123 (hoặc date - một trong hai bắt buộc)
  - event_type: click|view|scroll|hover|load
  - element_type: image|blog|review|service|button|link|video
  - page_url: specific page URL
```

#### 💡 Demo Website Example

File `frontend/demo-website.html` là ví dụ hoàn chỉnh về cách tích hợp tracking:

```bash
# Khởi động frontend demo
cd frontend
node server.js

# Truy cập: http://localhost:8000
```

Demo sẽ tracking:

- ✅ Page loads và views
- ✅ Clicks trên buttons, services, blogs, reviews
- ✅ Scroll depth tracking
- ✅ Hover events
- ✅ Real-time tracking info display

### 📈 Analytics APIs

#### 1. Thống kê clicks

```http
GET {{BASE_URL}}/api/analytics/clicks
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  - element_type: image|blog|review|service|button|link|video
```

#### 2. Thống kê page views

```http
GET {{BASE_URL}}/api/analytics/pageviews
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  - page_url: specific page URL
```

#### 3. Thống kê user activity

```http
GET {{BASE_URL}}/api/analytics/users
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
```

#### 4. Dashboard analytics

```http
GET {{BASE_URL}}/api/analytics/dashboard
Headers: X-API-Key: {{API_KEY}}
Query Parameters:
  - period: today|week|month|year
```

## 🧪 Ví dụ sử dụng với Postman

### 🎯 Quick Start

Sau khi khởi động server với `node server.js`, bạn có thể test API endpoints:

**Kiểm tra server hoạt động:**

- ✅ Main API endpoint: `GET http://localhost:3001/`
- ✅ Health check: `GET http://localhost:3001/health`

**Test APIs với API key:**

- ✅ Users API: `GET http://localhost:3001/api/users`
- ✅ Create user: `POST http://localhost:3001/api/users`
- ✅ Track event: `POST http://localhost:3001/api/tracking/event`
- ✅ Click analytics: `GET http://localhost:3001/api/analytics/clicks`

### 📋 Manual Testing với Postman

#### 🔥 Workflow khởi tạo hệ thống:

## 🔍 Kiểm tra kết nối Database

### Kiểm tra Cassandra:

```bash
# Kết nối vào Cassandra
cqlsh

# Kiểm tra keyspace
USE user_logs;

# Kiểm tra tables
DESCRIBE TABLES;

# Kiểm tra dữ liệu
SELECT * FROM users LIMIT 10;
SELECT * FROM events_by_date LIMIT 10;
SELECT * FROM user_events LIMIT 10;
```

## 🐛 Troubleshooting

### 📋 Debug thủ công

#### Lỗi thường gặp:

1. **Connection refused**: Kiểm tra Cassandra đã khởi động
2. **Keyspace not found**: Chạy lại setup script
3. **API Key invalid**: Kiểm tra header X-API-Key
4. **500 Internal Server Error**: Xem logs server để debug
5. **Port 3001 in use**: Kill process cũ trước khi chạy

#### Debug commands:

```bash
# Kiểm tra port đang dùng
lsof -i :3001

# Kill process trên port 3001
lsof -ti:3001 | xargs kill -9

# Khởi động với debug mode
DEBUG=* node server.js

# Kiểm tra Cassandra
cqlsh
```

## 📝 Notes

- Tất cả timestamps được lưu theo UTC
- Events được partition theo ngày để optimize performance
- API keys có thể được disable nhưng không xóa
- Metadata trong events được lưu dưới dạng JSON string
- Cassandra queries sử dụng prepared statements để tránh injection
-

## 🛠️ Commands hữu ích

```bash
# Khởi động backend API
node server.js

# Khởi động frontend demo
cd frontend && node server.js

# Tạo API key
node tools/api-key-manager.js create --name "Website Name" --url "https://example.com"

# Liệt kê API keys
node tools/api-key-manager.js list

# Setup database
cqlsh -f cassandra/setup-database.cql

# Debug mode
DEBUG=* node server.js
```

## 🚀 Deployment

### Production checklist:

- [ ] Cấu hình SSL/TLS
- [ ] Setup monitoring (Prometheus + Grafana)
- [ ] Configure log rotation
- [ ] Setup backup cho Cassandra
- [ ] Rate limiting cho APIs
- [ ] Input validation và sanitization
