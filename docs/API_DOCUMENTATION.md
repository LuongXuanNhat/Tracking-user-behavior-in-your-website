# User Behavior Tracking API Documentation

## Tổng quan

API này được xây dựng để theo dõi và phân tích hành vi người dùng trên website theo yêu cầu đề bài:

1. **Lượt click** - ảnh, bài đánh giá, bài blog
2. **Lượt xem**
3. **Phân tích** - Dịch vụ nào phổ biến nhất/ít dùng nhất

## Base URL

```
http://localhost:3001/api
```

## Authentication

**🔐 API Key Required** - Tất cả endpoints (trừ `/` và `/health`) đều yêu cầu API key để truy cập.

### 🔑 CÁCH LẤY API KEY:

#### **Bước 1: Khởi động API server**

```bash
cd /path/to/your/project
npm start
```

#### **Bước 2: Lấy danh sách API keys có sẵn**

**Method 1: Command Line (Nhanh nhất)**

```bash
curl http://localhost:3001/api/keys
```

**Method 2: Browser**

```
http://localhost:3001/api/keys
```

**Response sẽ trả về:**

```json
{
  "status": "success",
  "message": "Available API keys for testing",
  "data": {
    "production": "tracking_api_key_123456789",
    "demo": "demo_api_key_abcdefg",
    "test": "test_api_key_xyz"
  },
  "usage": {
    "header": "x-api-key: YOUR_API_KEY",
    "query": "?api_key=YOUR_API_KEY",
    "bearer": "Authorization: Bearer YOUR_API_KEY"
  },
  "quick_test": {
    "demo_example": "curl -H 'x-api-key: demo_api_key_abcdefg' http://localhost:3001/api/analytics/clicks",
    "production_example": "curl -H 'x-api-key: tracking_api_key_123456789' http://localhost:3001/api/users"
  }
}
```

#### **Bước 3: Copy API key phù hợp**

- **🌟 Recommended**: `demo_api_key_abcdefg` (cho demo và test)
- **🚀 Production**: `tracking_api_key_123456789` (full quyền)
- **🧪 Testing**: `test_api_key_xyz` (cho development)

### Cách sử dụng API Key:

**Option 1: Header (Recommended)**

```http
x-api-key: demo_api_key_abcdefg
```

**Option 2: Bearer Token**

```http
Authorization: Bearer demo_api_key_abcdefg
```

**Option 3: Query Parameter**

```http
GET /api/users?api_key=demo_api_key_abcdefg
```

### API Keys Available:

| Type           | API Key                      | Permissions                              |
| -------------- | ---------------------------- | ---------------------------------------- |
| **Production** | `tracking_api_key_123456789` | Full access (tracking, analytics, users) |
| **Demo**       | `demo_api_key_abcdefg`       | Read-only (tracking, analytics)          |
| **Test**       | `test_api_key_xyz`           | Full access with higher rate limit       |

### Permissions by Key Type:

- **Production**: ✅ Tracking, ✅ Analytics, ✅ Users (CRUD)
- **Demo**: ✅ Tracking, ✅ Analytics, ❌ Users (Read only)
- **Test**: ✅ All features for testing

### 🧪 **VÍ DỤ TEST API NGAY LẬP TỨC:**

#### **1. Test lấy API keys:**

```bash
curl http://localhost:3001/api/keys
```

#### **2. Test tracking event:**

```bash
curl -X POST http://localhost:3001/api/tracking/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo_api_key_abcdefg" \
  -d '{
    "user_id": "user_demo_123",
    "event_type": "click",
    "element_type": "image",
    "page_url": "https://example.com/portfolio",
    "element_id": "hero-banner"
  }'
```

#### **3. Test analytics:**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

#### **4. Test users (chỉ production/test key):**

```bash
curl -H "x-api-key: tracking_api_key_123456789" \
  http://localhost:3001/api/users
```

---

## 📊 TRACKING ENDPOINTS

### 1. Ghi nhận sự kiện đơn lẻ

```http
POST /tracking/event
```

**Request Body:**

```json
{
  "user_id": "user_1234567890",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://example.com/portfolio",
  "element_id": "hero-banner",
  "metadata": {
    "coordinates": { "x": 100, "y": 200 },
    "element_text": "Learn More",
    "session_id": "session_abc123"
  }
}
```

**Event Types:**

- `click` - Click chuột
- `view` - Xem trang/element
- `scroll` - Cuộn trang
- `hover` - Di chuột qua element
- `load` - Tải trang

**Element Types:**

- `image` - Hình ảnh
- `blog` - Bài blog
- `review` - Bài đánh giá
- `service` - Dịch vụ
- `button` - Nút bấm
- `link` - Liên kết

**Response:**

```json
{
  "status": "success",
  "message": "Event tracked successfully",
  "data": {
    "event_id": 123,
    "timestamp": "2025-01-21T10:30:00.000Z"
  }
}
```

### 2. Ghi nhận nhiều sự kiện cùng lúc

```http
POST /tracking/batch
```

**Request Body:**

```json
{
  "events": [
    {
      "user_id": "user_1234567890",
      "event_type": "click",
      "element_type": "image",
      "page_url": "https://example.com/portfolio",
      "element_id": "portfolio-img-1"
    },
    {
      "user_id": "user_1234567890",
      "event_type": "view",
      "element_type": "blog",
      "page_url": "https://example.com/blog",
      "element_id": "blog-post-1"
    }
  ]
}
```

### 3. Lấy danh sách events

```http
GET /tracking/events?user_id=user_123&event_type=click&limit=50&offset=0
```

**Query Parameters:**

- `user_id` (optional) - Lọc theo user
- `event_type` (optional) - Lọc theo loại event
- `element_type` (optional) - Lọc theo loại element
- `page_url` (optional) - Lọc theo URL
- `limit` (optional, default: 50) - Số lượng kết quả
- `offset` (optional, default: 0) - Vị trí bắt đầu

---

## 📈 ANALYTICS ENDPOINTS

### 1. Thống kê lượt click

```http
GET /analytics/clicks?element_type=image
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "summary": {
      "image": {
        "total_clicks": 245,
        "total_unique_users": 128,
        "items": [...]
      },
      "blog": {
        "total_clicks": 223,
        "total_unique_users": 156,
        "items": [...]
      }
    },
    "details": [...],
    "total_clicks": 468
  }
}
```

### 2. Thống kê lượt xem

```http
GET /analytics/views?page_url=/blog
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "pages": [
      {
        "page_url": "/home",
        "view_count": 1250,
        "unique_visitors": 890,
        "avg_time_on_page": "00:02:35",
        "bounce_rate": 0.35
      }
    ],
    "summary": {
      "total_views": 1250,
      "total_unique_visitors": 890,
      "avg_bounce_rate": "0.35"
    }
  }
}
```

### 3. Phân tích dịch vụ phổ biến

```http
GET /analytics/popular-services?period=7d
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "period": "7d",
    "most_popular": [
      {
        "service_name": "Web Development",
        "service_id": "web-dev",
        "interactions": {
          "views": 1250,
          "clicks": 340,
          "inquiries": 45,
          "conversions": 12
        },
        "popularity_score": 92,
        "trend": "increasing",
        "conversion_rate": "0.96",
        "click_through_rate": "27.20"
      }
    ],
    "least_popular": [...],
    "all_services": [...],
    "insights": {
      "total_services_analyzed": 6,
      "avg_popularity_score": "60.0",
      "trending_up": 2,
      "trending_down": 2
    }
  }
}
```

### 4. Dashboard tổng hợp

```http
GET /analytics/dashboard?period=7d
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "overview": {
      "total_events": 15420,
      "unique_users": 3248,
      "total_pageviews": 8945,
      "avg_session_duration": "00:04:32"
    },
    "top_events": [
      { "event_type": "click", "count": 6240, "percentage": 40.4 },
      { "event_type": "view", "count": 4890, "percentage": 31.7 }
    ],
    "top_elements": [
      { "element_type": "image", "interactions": 3456, "unique_users": 1234 }
    ],
    "hourly_activity": [...],
    "real_time": {
      "active_users": 23,
      "current_pageviews": 45,
      "events_last_minute": 12
    }
  }
}
```

---

## 👥 USER ENDPOINTS

### 1. Lấy danh sách users

```http
GET /users
```

### 2. Tạo user mới

```http
POST /users
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### 3. Lấy thông tin user

```http
GET /users/:id
```

### 4. Cập nhật user

```http
PUT /users/:id
```

**Request Body:**

```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "created_at": "2025-01-21T10:30:00.000Z",
    "updated_at": "2025-01-21T11:00:00.000Z"
  }
}
```

### 5. Xóa user

```http
DELETE /users/:id
```

**Response:**

```json
{
  "status": "success",
  "message": "User deleted successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## 🔧 SYSTEM ENDPOINTS

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:30:00.000Z",
  "uptime": 3600
}
```

### Validate API Key

```http
GET /api/validate-key
```

**Headers:**

```http
x-api-key: YOUR_API_KEY
```

**Response (Valid):**

```json
{
  "status": "success",
  "message": "API key is valid",
  "key_info": {
    "type": "production",
    "permissions": {
      "tracking": true,
      "analytics": true,
      "users": true
    }
  }
}
```

**Response (Invalid):**

```json
{
  "status": "error",
  "message": "Invalid API key"
}
```

### Get Available API Keys

```http
GET /api/keys
```

**Response:**

```json
{
  "status": "success",
  "message": "Available API keys for testing",
  "data": {
    "production": "tracking_api_key_123456789",
    "demo": "demo_api_key_abcdefg",
    "test": "test_api_key_xyz"
  },
  "usage": {
    "header": "x-api-key: YOUR_API_KEY",
    "query": "?api_key=YOUR_API_KEY",
    "bearer": "Authorization: Bearer YOUR_API_KEY"
  }
}
```

---

## 🌐 CLIENT TRACKING SCRIPT

### Cách sử dụng script tracking:

```html
<!-- Thêm vào HTML -->
<script src="tracking-script.js"></script>
<script>
  // Cấu hình
  window.userTrackingConfig = {
    apiUrl: "http://localhost:3001/api/tracking",
    apiKey: "demo_api_key_abcdefg", // API key bắt buộc
    enabled: true,
    batchSize: 10,
    batchTimeout: 5000,
  };

  // Khởi tạo
  const tracker = new UserTracker(window.userTrackingConfig);

  // Track sự kiện custom
  tracker.trackCustomEvent("click", "service", "web-development", {
    service_name: "Web Development",
    user_action: "inquiry",
  });
</script>
```

### Configuration Options:

| Option         | Type    | Default                              | Description               |
| -------------- | ------- | ------------------------------------ | ------------------------- |
| `apiUrl`       | string  | `http://localhost:3001/api/tracking` | API endpoint URL          |
| `apiKey`       | string  | **Required**                         | API key để authentication |
| `enabled`      | boolean | `true`                               | Bật/tắt tracking          |
| `batchSize`    | number  | `10`                                 | Số events gửi cùng lúc    |
| `batchTimeout` | number  | `5000`                               | Thời gian gửi batch (ms)  |
| `userId`       | string  | auto-generated                       | Custom user ID            |

### Các sự kiện được tự động track:

- ✅ **Click** trên mọi element
- ✅ **Scroll** trang (với debounce)
- ✅ **Hover** trên images và links
- ✅ **Page load/unload**
- ✅ **Page visibility changes**

---

## 📋 ERROR RESPONSES

Tất cả API endpoints đều trả về format lỗi nhất quán:

```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error message (if available)"
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (Invalid/Missing API Key)
- `403` - Forbidden (Insufficient Permissions)
- `404` - Not Found
- `500` - Internal Server Error

**Common API Key Errors:**

```json
{
  "status": "error",
  "message": "API key is required",
  "error": "Missing API key in request headers (x-api-key) or query parameter (api_key)"
}
```

```json
{
  "status": "error",
  "message": "Invalid API key",
  "error": "The provided API key is not valid"
}
```

---

## 🚀 Cách chạy API

1. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

2. **Chạy server:**

   ```bash
   npm start
   ```

3. **Test API:**
   - Mở `frontend/demo.html` trong browser
   - Hoặc dùng Postman để test endpoints

---

## 📊 Mục tiêu đạt được

Theo yêu cầu đề bài, API này đã implement:

1. ✅ **Tracking lượt click** - ảnh, bài đánh giá, bài blog
2. ✅ **Tracking lượt xem** trang và elements
3. ✅ **Phân tích dịch vụ** phổ biến nhất/ít dùng nhất
4. ✅ **API endpoints** cho tất cả chức năng trên
5. ✅ **Client script** để tracking tự động

Hệ thống sẵn sàng để mở rộng thêm Cassandra database và các tính năng nâng cao khác.
