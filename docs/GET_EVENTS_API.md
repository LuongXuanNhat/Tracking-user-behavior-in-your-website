# API Lấy Danh Sách Events Theo Website

## Endpoint

```
GET /api/websites/getAllEvent
```

## Mô tả

API này cho phép lấy danh sách event logs từ một website cụ thể theo website_id. Hỗ trợ nhiều bộ lọc khác nhau để phân tích hành vi người dùng.

## Headers

```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

## Query Parameters

| Parameter    | Type    | Required     | Default      | Mô tả                                       |
| ------------ | ------- | ------------ | ------------ | ------------------------------------------- |
| `website_id` | UUID    | **Bắt buộc** | -            | ID của website cần lấy events               |
| `start_date` | String  | Không        | 7 ngày trước | Ngày bắt đầu (YYYY-MM-DD)                   |
| `end_date`   | String  | Không        | Hôm nay      | Ngày kết thúc (YYYY-MM-DD)                  |
| `limit`      | Integer | Không        | 100          | Số lượng events tối đa trả về               |
| `event_type` | String  | Không        | -            | Lọc theo loại event (pageview, click, etc.) |
| `visitor_id` | UUID    | Không        | -            | Lọc theo visitor ID cụ thể                  |
| `session_id` | UUID    | Không        | -            | Lọc theo session ID cụ thể                  |

## Các Trường Hợp Sử Dụng

### 1. Lấy events mới nhất (7 ngày gần đây)

```
GET /api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000
```

### 2. Lấy events trong khoảng thời gian cụ thể

```
GET /api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&start_date=2025-08-01&end_date=2025-08-15
```

### 3. Lấy events theo loại cụ thể

```
GET /api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&event_type=click&start_date=2025-08-01
```

### 4. Phân tích hành trình người dùng (User Journey)

```
GET /api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&visitor_id=456e7890-e89b-12d3-a456-426614174001
```

### 5. Phân tích session cụ thể

```
GET /api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&session_id=789e0123-e89b-12d3-a456-426614174002
```

## Response Format

### Thành công (200 OK)

```json
{
  "success": true,
  "message": "Lấy danh sách events thành công",
  "data": {
    "events": [
      {
        "event_id": "123e4567-e89b-12d3-a456-426614174000",
        "website_id": "456e7890-e89b-12d3-a456-426614174001",
        "visitor_id": "789e0123-e89b-12d3-a456-426614174002",
        "user_id": null,
        "session_id": "012e3456-e89b-12d3-a456-426614174003",
        "event_date": "2025-08-15",
        "event_time": "2025-08-15T10:30:00.000Z",
        "event_type": "pageview",
        "event_name": "Homepage Visit",
        "page_url": "https://example.com/",
        "page_title": "Homepage",
        "element_selector": null,
        "element_text": null,
        "device_type": "desktop",
        "browser": "Chrome",
        "os": "Windows 10/11",
        "ip_address": "192.168.1.1",
        "country": "Vietnam",
        "city": "Ho Chi Minh City",
        "referrer": "https://google.com",
        "utm_source": "google",
        "utm_medium": "organic",
        "utm_campaign": null,
        "duration_since_start": 0,
        "properties": {
          "viewport_width": "1920",
          "viewport_height": "1080"
        }
      }
    ],
    "stats": {
      "total_events": 1,
      "date_range": {
        "start_date": "2025-08-01",
        "end_date": "2025-08-15"
      },
      "filters_applied": {
        "website_id": "456e7890-e89b-12d3-a456-426614174001",
        "event_type": null,
        "visitor_id": null,
        "session_id": null
      }
    },
    "events_by_type": {
      "pageview": 15,
      "click": 8,
      "scroll": 12
    },
    "pagination": {
      "limit": 100,
      "returned_count": 35
    }
  }
}
```

### Lỗi - Thiếu website_id (400 Bad Request)

```json
{
  "success": false,
  "message": "website_id là bắt buộc"
}
```

### Lỗi - Website không tồn tại (404 Not Found)

```json
{
  "success": false,
  "message": "Không tìm thấy website"
}
```

### Lỗi - Không có quyền truy cập (403 Forbidden)

```json
{
  "success": false,
  "message": "Không có quyền truy cập website này"
}
```

### Lỗi server (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Lỗi server khi lấy danh sách events",
  "error": "Chi tiết lỗi..."
}
```

## Ví dụ sử dụng với cURL

```bash
# Lấy events mới nhất
curl -X GET "http://localhost:3000/api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer your_customer_token"

# Lấy events click trong tháng 8
curl -X GET "http://localhost:3000/api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&event_type=click&start_date=2025-08-01&end_date=2025-08-31" \
  -H "Authorization: Bearer your_customer_token"

# Phân tích user journey
curl -X GET "http://localhost:3000/api/websites/getAllEvent?website_id=123e4567-e89b-12d3-a456-426614174000&visitor_id=456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer your_customer_token"
```

## Ví dụ sử dụng với JavaScript

```javascript
// Lấy events của website
async function getWebsiteEvents(websiteId, filters = {}) {
  const params = new URLSearchParams({
    website_id: websiteId,
    ...filters,
  });

  const response = await fetch(`/api/websites/getAllEvent?${params}`, {
    headers: {
      Authorization: `Bearer ${customerToken}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}

// Sử dụng
const events = await getWebsiteEvents("123e4567-e89b-12d3-a456-426614174000", {
  start_date: "2025-08-01",
  end_date: "2025-08-15",
  event_type: "click",
  limit: 50,
});
```

## Lưu ý quan trọng

1. **Xác thực**: API yêu cầu customer authentication token
2. **Phân quyền**: Chỉ có thể lấy events của websites thuộc về customer hiện tại
3. **Hiệu suất**: Sử dụng limit hợp lý để tránh quá tải
4. **Date format**: Sử dụng định dạng YYYY-MM-DD cho các tham số ngày
5. **UUID format**: Tất cả các ID phải đúng định dạng UUID
6. **Mặc định**: Nếu không có start_date, sẽ lấy events trong 7 ngày gần nhất

## Các loại Event Type phổ biến

- `pageview`: Người dùng xem trang
- `click`: Người dùng click element
- `scroll`: Người dùng cuộn trang
- `form_submit`: Gửi form
- `purchase`: Thực hiện mua hàng
- `signup`: Đăng ký tài khoản
- `login`: Đăng nhập
- `download`: Tải file
- `video_play`: Phát video
- `search`: Tìm kiếm
