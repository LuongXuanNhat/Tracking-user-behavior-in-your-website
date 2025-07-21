# 🔑 Hướng dẫn lấy và sử dụng API Key

## 🚀 CÁCH NHANH NHẤT - Lấy API Key trong 30 giây

### Bước 1: Khởi động API Server

```bash
cd /path/to/Tracking-user-behavior-in-your-website
npm start
```

**Chờ thông báo:** `Server is running at http://localhost:3001`

### Bước 2: Lấy API Keys

Mở một terminal khác và chạy:

```bash
curl http://localhost:3001/api/keys
```

**Hoặc mở browser:** `http://localhost:3001/api/keys`

### Bước 3: Copy API Key

Response sẽ trả về:

```json
{
  "status": "success",
  "data": {
    "production": "tracking_api_key_123456789",
    "demo": "demo_api_key_abcdefg",
    "test": "test_api_key_xyz"
  }
}
```

**👉 Copy key này:** `demo_api_key_abcdefg`

---

## 📋 DANH SÁCH API KEYS SẴN DÙNG

### 🌟 Recommended - Demo Key (Cho hầu hết trường hợp)

```
demo_api_key_abcdefg
```

- ✅ Tracking events
- ✅ Xem analytics
- ❌ Tạo/sửa/xóa users

### 🚀 Production Key (Full quyền)

```
tracking_api_key_123456789
```

- ✅ Tracking events
- ✅ Xem analytics
- ✅ Quản lý users (CRUD)

### 🧪 Test Key (Development)

```
test_api_key_xyz
```

- ✅ Full quyền như production
- ✅ Rate limit cao hơn

---

## 🛠️ CÁCH SỬ DỤNG API KEY

### Method 1: Header (Khuyến nghị)

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

### Method 2: Bearer Token

```bash
curl -H "Authorization: Bearer demo_api_key_abcdefg" \
  http://localhost:3001/api/users
```

### Method 3: Query Parameter

```bash
curl "http://localhost:3001/api/tracking/events?api_key=demo_api_key_abcdefg"
```

---

## ✅ TEST API KEY HOẠT ĐỘNG

### Test 1: Validate API Key

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/validate-key
```

**Expected response:**

```json
{
  "status": "success",
  "message": "API key is valid",
  "key_info": {
    "type": "demo"
  }
}
```

### Test 2: Track một event

```bash
curl -X POST http://localhost:3001/api/tracking/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo_api_key_abcdefg" \
  -d '{
    "user_id": "test_user_123",
    "event_type": "click",
    "element_type": "image",
    "page_url": "https://mywebsite.com/home",
    "element_id": "hero-image"
  }'
```

**Expected response:**

```json
{
  "status": "success",
  "message": "Event tracked successfully",
  "data": {
    "event_id": 1,
    "timestamp": "2025-07-21T10:30:00.000Z"
  }
}
```

### Test 3: Xem analytics

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

---

## 🌐 SỬ DỤNG TRONG CLIENT CODE

### JavaScript/HTML

```html
<script src="tracking-script.js"></script>
<script>
  window.userTrackingConfig = {
    apiUrl: "http://localhost:3001/api/tracking",
    apiKey: "demo_api_key_abcdefg", // ← API key ở đây
    enabled: true,
  };

  const tracker = new UserTracker(window.userTrackingConfig);
</script>
```

### React/Vue.js

```javascript
const trackingConfig = {
  apiUrl: "http://localhost:3001/api/tracking",
  apiKey: "demo_api_key_abcdefg", // ← API key ở đây
  enabled: true,
};

const tracker = new UserTracker(trackingConfig);
```

### Fetch API

```javascript
fetch("http://localhost:3001/api/analytics/clicks", {
  headers: {
    "x-api-key": "demo_api_key_abcdefg", // ← API key ở đây
  },
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

---

## 🚨 XỬ LÝ LỖI API KEY

### Lỗi thiếu API key (401)

```json
{
  "status": "error",
  "message": "API key is required",
  "error": "Missing API key in request headers (x-api-key) or query parameter (api_key)"
}
```

**Cách fix:** Thêm API key vào request

### Lỗi API key không hợp lệ (401)

```json
{
  "status": "error",
  "message": "Invalid API key",
  "error": "The provided API key is not valid"
}
```

**Cách fix:** Kiểm tra lại API key, lấy key mới từ `/api/keys`

---

## 💡 TIPS & BEST PRACTICES

### ✅ DO:

- Dùng `demo_api_key_abcdefg` cho testing thông thường
- Dùng header `x-api-key` thay vì query parameter
- Kiểm tra response status trước khi xử lý data
- Validate API key trước khi deploy

### ❌ DON'T:

- Expose production key trong client-side code
- Hard-code API key trong source code (dùng environment variables)
- Dùng demo key cho production

### 🔒 Security Notes:

- API keys này chỉ để demo/development
- Production thật nên dùng JWT tokens hoặc OAuth
- Store API keys trong environment variables

---

## 🆘 TROUBLESHOOTING

### Problem: "Connection refused"

```bash
curl: (7) Failed to connect to localhost port 3001: Connection refused
```

**Solution:** Khởi động server trước: `npm start`

### Problem: "404 Not Found"

```bash
{"status":"error","message":"Endpoint not found"}
```

**Solution:** Kiểm tra URL, đảm bảo có `/api/` prefix

### Problem: CORS error trong browser

**Solution:** API đã config CORS, nhưng nếu vẫn lỗi thì check browser console

---

## 🎯 QUICK REFERENCE

| Endpoint             | API Key Required | Method          | Example                                                                            |
| -------------------- | ---------------- | --------------- | ---------------------------------------------------------------------------------- |
| `/`                  | ❌ No            | GET             | `curl http://localhost:3001/`                                                      |
| `/health`            | ❌ No            | GET             | `curl http://localhost:3001/health`                                                |
| `/api/keys`          | ❌ No            | GET             | `curl http://localhost:3001/api/keys`                                              |
| `/api/validate-key`  | ✅ Yes           | GET             | `curl -H "x-api-key: demo_api_key_abcdefg" http://localhost:3001/api/validate-key` |
| `/api/tracking/*`    | ✅ Yes           | POST/GET        | `curl -H "x-api-key: demo_api_key_abcdefg" ...`                                    |
| `/api/analytics/*`   | ✅ Yes           | GET             | `curl -H "x-api-key: demo_api_key_abcdefg" ...`                                    |
| `/api/users` (read)  | ✅ Yes           | GET             | `curl -H "x-api-key: demo_api_key_abcdefg" ...`                                    |
| `/api/users` (write) | ✅ Production    | POST/PUT/DELETE | `curl -H "x-api-key: tracking_api_key_123456789" ...`                              |

**🎉 Bây giờ bạn đã có thể sử dụng API với API key!**
