# 📚 User Behavior Tracking API - Documentation

## 🚀 Quick Start

### 🔧 Chạy với script tự động (Khuyến nghị)

```bash
# Script tự động check + install + start + test
./run_api.sh
```

### 🛠️ Hoặc chạy thủ công

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi động server
npm start
# Server chạy tại: http://localhost:3001
```

### 🧪 Test cơ bản

```bash
# Test server hoạt động (không cần API key)
curl http://localhost:3001/

# Test với API key
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
```

---

## 🎯 Mục đích

API track user behavior trên website:

- ✅ **Click tracking** - Ảnh, bài đánh giá, bài blog, buttons
- ✅ **View tracking** - Page views, content views
- ✅ **Analytics** - Thống kê clicks, popular services
- ✅ **User management** - CRUD users
- ✅ **API Key management** - Dynamic keys

---

## 🔑 API Keys

### Development Keys (có sẵn trong .env)

```bash
demo_api_key_abcdefg       # Read-only (GET endpoints)
test_api_key_xyz           # Full access
tracking_api_key_123456789 # Full access
```

### CLI Tool Usage

API Key management có sẵn npm scripts tiện lợi:

```bash
# Liệt kê tất cả API keys
npm run key:list

# Xem thống kê usage
npm run key:stats

# Tạo API key mới
npm run key:create -- -n "Test Website" -u "https://test.com" -t "production" -d "Test production key"

# Vô hiệu hóa API key
npm run key:disable -- 1

# Check API key chi tiết
npm run key:check -- <api-key-string>
```

### Postman Collection Variables

Thêm các variables này vào Postman environment:

```
BASE_URL: http://localhost:3001
DEMO_KEY: demo_api_key_abcdefg
TEST_KEY: test_api_key_xyz
PROD_KEY: tracking_api_key_123456789
# API key động từ CLI tool
DYNAMIC_KEY: <sẽ-tạo-từ-cli>
```

### 🔄 Hướng dẫn sử dụng DYNAMIC_KEY

#### Bước 1: Tạo API key mới qua CLI

```bash
# Tạo key production cho website
npm run key:create -- -n "My Postman Tests" -u "https://postman-test.com" -t "production" -d "Key for Postman testing"

# Output sẽ hiển thị API key mới:
# ✅ API Key created successfully!
# 🔑 API Key: api_key_1737462000000_abc123xyz
# 📊 ID: 1
# 🌐 Website: My Postman Tests
```

#### Bước 2: Copy API key vào Postman Environment

1. **Mở Postman** → **Environments** → **Your Environment**
2. **Thêm/Update variable**:
   ```
   DYNAMIC_KEY = api_key_1737462000000_abc123xyz
   ```
3. **Save Environment**

#### Bước 3: Test với DYNAMIC_KEY

Sử dụng `{{DYNAMIC_KEY}}` trong Postman requests:

```json
# Example: Create User với DYNAMIC_KEY
POST {{BASE_URL}}/api/users
Headers: x-api-key: {{DYNAMIC_KEY}}
Body:
{
  "name": "Test User",
  "email": "test@dynamic.com"
}
```

### Testing Flow

1. **Khởi động server**: `npm start`
2. **Tạo API key động**: `npm run key:create -- -n "My Site" -u "https://mysite.com" -t "production"`
3. **Copy key vào Postman**: Update DYNAMIC_KEY variable
4. **Test endpoints**: Dùng `{{DYNAMIC_KEY}}` trong headers
5. **Monitor usage**: `npm run key:stats` để theo dõi

### 🧪 Testing với Dynamic Keys

#### Workflow hoàn chình:

```bash
# 1. Tạo key mới
npm run key:create -- -n "E-commerce Test" -u "https://shop.test" -t "production"

# 2. List để xem key vừa tạo
npm run key:list

# 3. Copy API key → Postman Environment
# 4. Test API với {{DYNAMIC_KEY}}

# 5. Check stats usage
npm run key:stats
```

#### Test requests với DYNAMIC_KEY:

```json
# Track Event
POST {{BASE_URL}}/api/tracking/event
Headers: x-api-key: {{DYNAMIC_KEY}}
Body: {
  "user_id": "user_dynamic_123",
  "event_type": "click",
  "element_type": "button",
  "page_url": "https://shop.test/checkout"
}

# Create Website
POST {{BASE_URL}}/api/websites
Headers: x-api-key: {{DYNAMIC_KEY}}
Body: {
  "name": "Dynamic Test Site",
  "url": "https://dynamic-test.com"
}
```

### Security Notes

- ✅ API keys động được lưu trong `data/api-keys.json`
- ✅ Middleware tự động validate permissions
- ✅ Tracking requests và usage statistics
- ❌ Không hardcode API keys trong code
- ❌ Không commit API keys vào Git

---

## 📋 API Endpoints

### Public Endpoints (Không cần API key)

- `GET /` - API info
- `GET /health` - Health check

### Protected Endpoints (Cần API key)

#### 👥 Users API

- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy user theo ID
- `POST /api/users` - Tạo user mới _(cần permission 'users')_
- `PUT /api/users/:id` - Cập nhật user _(cần permission 'users')_
- `DELETE /api/users/:id` - Xóa user _(cần permission 'users')_

#### 📊 Tracking API

- `POST /api/tracking/event` - Track single event
- `POST /api/tracking/batch` - Track multiple events
- `GET /api/tracking/events` - Lấy tracked events (có filter)

#### 📈 Analytics API

- `GET /api/analytics/clicks` - Thống kê clicks theo element type
- `GET /api/analytics/views` - Thống kê page views
- `GET /api/analytics/popular-services` - Dịch vụ phổ biến/ít dùng
- `GET /api/analytics/dashboard` - Dashboard tổng hợp

#### 🌐 Website API

- `GET /api/websites` - Lấy tất cả websites
- `POST /api/websites` - Tạo website mới _(cần permission 'users')_
- `GET /api/websites/stats` - Thống kê websites
- `GET /api/websites/:id` - Lấy website theo ID
- `PUT /api/websites/:id` - Cập nhật website _(cần permission 'users')_
- `DELETE /api/websites/:id` - Xóa website _(cần permission 'users')_
- `POST /api/websites/:id/regenerate-key` - Tạo lại API key cho website _(cần permission 'users')_

#### 🔑 API Key Management

- `GET /api/keys` - Danh sách dynamic keys
- `POST /api/keys` - Tạo key mới
- `GET /api/keys/stats` - Thống kê keys
- `GET /api/keys/valid` - Lấy danh sách keys hợp lệ (dev only)
- `GET /api/keys/:keyId` - Chi tiết API key
- `PUT /api/keys/:keyId/disable` - Vô hiệu hóa key
- `PUT /api/keys/:keyId/extend` - Gia hạn key

---

## 🧪 Test với Postman

### 1. Setup Environment

Tạo Environment trong Postman:

```
BASE_URL = http://localhost:3001
DEMO_KEY = demo_api_key_abcdefg
TEST_KEY = test_api_key_xyz
PROD_KEY = tracking_api_key_123456789
DYNAMIC_KEY = <copy-from-cli-output>
```

### 2. Authentication

Tất cả protected endpoints cần header:

```
x-api-key: {{DYNAMIC_KEY}}
```

### 3. Dynamic Key Test Flow

1. **Tạo key**: `npm run key:create -- -n "Postman Test" -u "https://test.com" -t "production"`
2. **Copy output**: `api_key_1737462000000_abc123xyz`
3. **Update Postman**: DYNAMIC_KEY = `api_key_1737462000000_abc123xyz`
4. **Test API**: Dùng `{{DYNAMIC_KEY}}` trong headers
5. **Verify stats**: `npm run key:stats`

### 4. Sample Requests với Dynamic Keys

#### Test với DYNAMIC_KEY (Recommended)

```json
# Track Event với dynamic key
POST {{BASE_URL}}/api/tracking/event
Headers: x-api-key: {{DYNAMIC_KEY}}
Body:
{
  "user_id": "user_dynamic_123",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://postman-test.com/gallery",
  "element_id": "image-1",
  "metadata": {
    "source": "postman_testing",
    "key_type": "dynamic"
  }
}

# Create User với dynamic key
POST {{BASE_URL}}/api/users
Headers: x-api-key: {{DYNAMIC_KEY}}
Body:
{
  "name": "Dynamic User",
  "email": "dynamic@test.com"
}

# Get API Key Stats (check your key usage)
GET {{BASE_URL}}/api/keys/stats
Headers: x-api-key: {{DYNAMIC_KEY}}
```

#### Fallback với Static Keys

```json
# Track Image Click (fallback)
POST {{BASE_URL}}/api/tracking/event
Headers: x-api-key: {{PROD_KEY}}
Body:
{
  "user_id": "user_123",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://example.com/portfolio",
  "element_id": "project-1",
  "metadata": {
    "project_name": "E-commerce Site",
    "coordinates": {"x": 100, "y": 200}
  }
}
```

#### Create Website

```json
POST {{BASE_URL}}/api/websites
Headers: x-api-key: {{PROD_KEY}}
Body:
{
  "name": "My Portfolio",
  "url": "https://myportfolio.com",
  "description": "Personal portfolio website",
  "type": "production"
}
```

#### Create API Key (Dynamic)

```json
POST {{BASE_URL}}/api/keys
Headers: x-api-key: {{PROD_KEY}}
Body:
{
  "websiteName": "E-commerce Store",
  "websiteUrl": "https://store.example.com",
  "type": "production",
  "description": "Online store tracking"
}
```

#### Get API Key Stats

```json
GET {{BASE_URL}}/api/keys/stats
Headers: x-api-key: {{PROD_KEY}}
```

#### Disable API Key

```json
PUT {{BASE_URL}}/api/keys/1/disable
Headers: x-api-key: {{PROD_KEY}}
Body:
{
  "reason": "No longer needed"
}
```

---

## 💡 Event Types & Element Types

### Event Types (event_type)

- `click` - Click events
- `view` - Page/content views
- `scroll` - Scroll events
- `hover` - Hover events
- `load` - Page load events

### Element Types (element_type)

- `image` - Hình ảnh, photos
- `blog` - Bài blog
- `review` - Bài đánh giá
- `service` - Dịch vụ
- `button` - Buttons, CTAs
- `link` - Links, navigation
- `video` - Video content
- `text` - Text content

---

## 🛡️ Permissions

| API Key Type | Users CRUD | Tracking | Analytics |
| ------------ | ---------- | -------- | --------- |
| Demo         | ❌         | ✅       | ✅        |
| Test         | ✅         | ✅       | ✅        |
| Production   | ✅         | ✅       | ✅        |

**Lưu ý**: Demo keys chỉ có quyền READ, không thể CREATE/UPDATE/DELETE users.

---

## 🔧 Troubleshooting

### Lỗi "API key is required" (401)

- Thêm header: `x-api-key: YOUR_KEY`
- Hoặc query param: `?api_key=YOUR_KEY`

### Lỗi "Insufficient permissions" (403)

- Demo key không thể tạo/sửa/xóa users
- Dùng test_api_key_xyz hoặc tracking_api_key_123456789

### Port 3001 đã được sử dụng

```bash
# Kill process trên port 3001
lsof -ti:3001 | xargs kill -9
```

### Script run_api.sh permission denied

```bash
chmod +x run_api.sh
```

---

## ✅ Success Indicators

Khi chạy `./run_api.sh` thành công, bạn sẽ thấy:

```
🎉 ALL TESTS PASSED! (7/7)
✅ API is working perfectly!
🌐 Server running at: http://localhost:3001
```

Hoặc test thủ công:

- `GET /health` → Status 200
- `GET /api/users` (với API key) → Status 200, có data users
- `POST /api/tracking/event` (với API key) → Status 201, event tracked

**🚀 Khi thấy các indicators trên → API sẵn sàng sử dụng!**
