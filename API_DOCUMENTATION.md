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

Hiện tại API không yêu cầu authentication (có thể thêm sau).

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
- `404` - Not Found
- `500` - Internal Server Error

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
