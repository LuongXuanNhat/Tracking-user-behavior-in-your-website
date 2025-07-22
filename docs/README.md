# 📚 User Behavior Tracking API với Cassandra Database

## 🚀 Quick Start

### 🔧 Setup hoàn chỉnh (Khuyến nghị)

```bash
# 1. Clone và cài đặt dependencies
git clone <repo-url>
cd Tracking-user-behavior-in-your-website
npm install

# 2. Khởi động Cassandra Database
docker-compose up -d cassandra

# 3. Khởi động API Server
npm start

# Server chạy tại: http://localhost:3001
```

### ✅ Kiểm tra hệ thống hoạt động

```bash
# 1. Test server
curl http://localhost:3001/
# Expected: {"message": "API is running", "status": "healthy"}

# 2. Test với API key có sẵn
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
# Expected: {"status": "success", "data": [...]}
```

---

## 🔧 System Architecture

### 🗄️ Database: Apache Cassandra 4.1

- **Keyspace**: `user_logs`
- **Tables**: `users`, `websites`, `api_keys`, `user_events`, `events_by_date`
- **Features**: UUID primary keys, partitioning, high performance

### � API Authentication

- **Header**: `x-api-key: your_api_key`
- **Query param**: `?api_key=your_api_key`
- **Built-in keys**: Demo, Test, Production keys

---

## 🔑 API Keys - Giải quyết lỗi 401

### ❌ Khi gặp lỗi này:

```json
{
  "status": "error",
  "message": "API key is required",
  "error": "Missing API key in request headers (x-api-key) or query parameter (api_key)"
}
```

### ✅ Cách khắc phục:

#### 1. **Sử dụng API keys có sẵn (Immediate Solution)**

```bash
# Demo key (Read-only)
demo_api_key_abcdefg

# Test key (Full access)
test_api_key_xyz

# Production key (Full access)
tracking_api_key_123456789
```

#### 2. **Tạo API key động (Recommended)**

```bash
# Tạo key mới qua CLI
npm run key:create -- -n "My Website" -u "https://mysite.com" -t "production"

# Output sẽ hiển thị:
# ✅ API Key created successfully!
# 🔑 API Key: tk_1737462000000_abc123xyz456
# (Key này sẽ lưu vào Cassandra database)
```

#### 3. **Cách sử dụng trong requests**

**Postman/HTTP Client:**

```
Headers:
  x-api-key: demo_api_key_abcdefg
```

**cURL:**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
```

**Query Parameter (alternative):**

```bash
curl "http://localhost:3001/api/users?api_key=demo_api_key_abcdefg"
```

---

## 📋 Step-by-Step Testing Guide với Postman

### Bước 1: Chuẩn bị Environment

1. **Mở Postman** → **Environments** → **Create Environment**
2. **Tên Environment**: "User Tracking API"
3. **Thêm variables:**

| Variable   | Value                        | Notes           |
| ---------- | ---------------------------- | --------------- |
| `BASE_URL` | `http://localhost:3001`      | Server address  |
| `DEMO_KEY` | `demo_api_key_abcdefg`       | Read-only key   |
| `TEST_KEY` | `test_api_key_xyz`           | Full access key |
| `PROD_KEY` | `tracking_api_key_123456789` | Production key  |

4. **Save** và **Select** environment

### Bước 2: Test API không cần Authentication

#### 2.1 Health Check

```
Method: GET
URL: {{BASE_URL}}/
Headers: (none needed)

Expected Response (200):
{
  "message": "User Behavior Tracking API is running!",
  "version": "2.0.0",
  "database": "Cassandra",
  "status": "healthy"
}
```

#### 2.2 System Health

```
Method: GET
URL: {{BASE_URL}}/health
Headers: (none needed)

Expected Response (200):
{
  "status": "healthy",
  "database": "connected",
  "cassandra": "ready"
}
```

### Bước 3: Test Users API (Cassandra Integration)

#### 3.1 Get All Users (Read Permission)

```
Method: GET
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{DEMO_KEY}}

Expected Response (200):
{
  "status": "success",
  "data": [
    {
      "id": "uuid-string",
      "name": "User Name",
      "email": "user@email.com",
      "created_at": "2025-01-22T10:30:00.000Z"
    }
  ]
}
```

#### 3.2 Create User (Write Permission Required)

```
Method: POST
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "name": "Test User from Postman",
  "email": "postman@test.com"
}

Expected Response (201):
{
  "status": "success",
  "data": {
    "id": "generated-uuid",
    "name": "Test User from Postman",
    "email": "postman@test.com",
    "created_at": "2025-01-22T..."
  }
}
```

#### 3.3 Get User by ID

```
Method: GET
URL: {{BASE_URL}}/api/users/{user_id}
Headers:
  x-api-key: {{DEMO_KEY}}

# Replace {user_id} với ID từ response create user
```

### Bước 4: Test Event Tracking (Lưu vào Cassandra)

#### 4.1 Track Single Event

```
Method: POST
URL: {{BASE_URL}}/api/tracking/event
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "user_id": "user_123",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://mysite.com/gallery",
  "element_id": "img_001",
  "metadata": {
    "source": "postman_test",
    "campaign": "winter_sale",
    "device": "desktop"
  }
}

Expected Response (201):
{
  "status": "success",
  "message": "Event tracked successfully",
  "data": {
    "event_id": "generated-uuid",
    "timestamp": "2025-01-22T..."
  }
}
```

#### 4.2 Track Batch Events

```
Method: POST
URL: {{BASE_URL}}/api/tracking/batch
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "events": [
    {
      "user_id": "user_123",
      "event_type": "view",
      "element_type": "blog",
      "page_url": "https://mysite.com/blog/post1"
    },
    {
      "user_id": "user_123",
      "event_type": "click",
      "element_type": "button",
      "page_url": "https://mysite.com/contact"
    }
  ]
}
```

#### 4.3 Get Tracked Events

```
Method: GET
URL: {{BASE_URL}}/api/tracking/events
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  user_id: user_123
  event_type: click
  limit: 10

Expected Response:
{
  "status": "success",
  "data": {
    "events": [...],
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

### Bước 5: Test Analytics (Data từ Cassandra)

#### 5.1 Click Analytics

```
Method: GET
URL: {{BASE_URL}}/api/analytics/clicks
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  element_type: image
  start_date: 2025-01-01
  end_date: 2025-01-31

Expected Response:
{
  "status": "success",
  "data": {
    "summary": {
      "image": {
        "total_clicks": 25,
        "unique_users": 8
      }
    },
    "details": [...],
    "total_clicks": 25
  }
}
```

#### 5.2 View Analytics

```
Method: GET
URL: {{BASE_URL}}/api/analytics/views
Headers:
  x-api-key: {{DEMO_KEY}}

Expected Response:
{
  "status": "success",
  "data": {
    "pages": [
      {
        "page_url": "https://mysite.com/home",
        "view_count": 150,
        "unique_visitors": 45
      }
    ],
    "summary": {
      "total_views": 150,
      "total_unique_visitors": 45
    }
  }
}
```

### Bước 6: Test Dynamic API Keys (Cassandra Storage)

#### 6.1 Create New API Key via API

```
Method: POST
URL: {{BASE_URL}}/api/keys
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "websiteName": "Postman Test Site",
  "websiteUrl": "https://postman-test.com",
  "type": "production",
  "description": "API key created via Postman for testing"
}

Expected Response (201):
{
  "status": "success",
  "message": "API key created successfully",
  "data": {
    "id": 1,
    "apiKey": "tk_1737462000000_abc123xyz456",
    "websiteName": "Postman Test Site",
    "type": "production",
    "status": "active"
  }
}
```

#### 6.2 Test với Dynamic Key vừa tạo

```
# Copy API key từ response trên
# Add vào Postman Environment: DYNAMIC_KEY = tk_1737462000000_abc123xyz456

Method: GET
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{DYNAMIC_KEY}}

# Nếu success → API key đã lưu vào Cassandra và hoạt động!
```

#### 6.3 Get API Key Stats

```
Method: GET
URL: {{BASE_URL}}/api/keys/stats
Headers:
  x-api-key: {{TEST_KEY}}

Expected Response:
{
  "status": "success",
  "data": {
    "total": 4,
    "active": 4,
    "byType": {
      "production": 1,
      "demo": 1,
      "test": 2
    },
    "totalUsage": 15
  }
}
```

---

## 🛠️ CLI Tools - Tạo API Keys

### Tạo API Key qua Command Line

```bash
# Cú pháp cơ bản
npm run key:create -- -n "Website Name" -u "https://website.com" -t "production"

# Ví dụ thực tế
npm run key:create -- -n "E-commerce Store" -u "https://mystore.com" -t "production" -d "Store tracking key"

# Output:
# ✅ API Key created successfully!
# 📋 Key Details:
#    ID: 1
#    🌐 Website: E-commerce Store
#    🔗 URL: https://mystore.com
#    📋 Type: production
#    📝 Status: active
#    📅 Created: 2025-01-22T03:38:31.511Z
#    ⏰ Expires: 2026-01-22T03:38:31.511Z
#
# 🔑 API Key (copy this immediately):
#    tk_1737535511511_f43241a72d37f5d4510b5fe48af714b1
#
# ⚠️  Important: Store this key securely. It will not be shown again.
```

### Quản lý API Keys

```bash
# Liệt kê tất cả keys
npm run key:list

# Xem thống kê usage
npm run key:stats

# Check key chi tiết
npm run key:check -- tk_1737535511511_f43241a72d37f5d4510b5fe48af714b1

# Vô hiệu hóa key
npm run key:disable -- 1
```

---

## 🚨 Troubleshooting Guide

### ❌ Lỗi "API key is required" (401)

```json
{
  "status": "error",
  "message": "API key is required"
}
```

**Giải pháp:**

1. Thêm header: `x-api-key: demo_api_key_abcdefg`
2. Hoặc query param: `?api_key=demo_api_key_abcdefg`
3. Kiểm tra spelling: `x-api-key` (có dấu gạch ngang)

### ❌ Lỗi "Insufficient permissions" (403)

```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

**Giải pháp:**

- Demo key chỉ có quyền READ → Dùng `test_api_key_xyz` cho CREATE/UPDATE/DELETE
- Hoặc tạo key mới: `npm run key:create -- -n "Test" -u "https://test.com" -t "production"`

### ❌ Lỗi Cassandra Connection

```bash
# Check Cassandra container
docker-compose ps

# Expected output:
# NAME        IMAGE         STATUS
# cassandra   cassandra:4.1   Up 2 minutes (healthy)

# Nếu không chạy:
docker-compose up -d cassandra

# Check logs
docker-compose logs cassandra
```

### ❌ Lỗi Port 3001 đã được sử dụng

```bash
# Kill process trên port 3001
lsof -ti:3001 | xargs kill -9

# Hoặc dùng port khác
PORT=3002 npm start
```

### ❌ Dynamic API Key không hoạt động

**Nguyên nhân**: Key chưa được lưu vào Cassandra

**Giải pháp:**

```bash
# 1. Restart server để đảm bảo Cassandra connection
npm start

# 2. Tạo key mới sau khi server chạy ổn định
npm run key:create -- -n "Test Key" -u "https://test.com" -t "production"

# 3. Test ngay key vừa tạo
curl -H "x-api-key: <new-key>" http://localhost:3001/api/users
```

---

## ✅ Success Indicators

### 🎯 Server khởi động thành công:

```
🔄 Connecting to Cassandra...
✅ Connected to Cassandra successfully
✅ ApiKey Cassandra tables initialized
✅ Loaded X API keys from Cassandra
🚀 Server is running at http://localhost:3001
```

### 🧪 Test thành công:

**1. Health Check:**

```bash
curl http://localhost:3001/
# → 200: {"message": "API is running", "status": "healthy"}
```

**2. Authentication:**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" http://localhost:3001/api/users
# → 200: {"status": "success", "data": [...]}
```

**3. Dynamic Key Test:**

```bash
# Sau khi tạo key qua CLI
curl -H "x-api-key: tk_1737535511511_..." http://localhost:3001/api/users
# → 200: Success → Key đã lưu vào Cassandra!
```

**4. Event Tracking:**

```bash
curl -X POST \
  -H "x-api-key: test_api_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","event_type":"click","element_type":"button","page_url":"https://test.com"}' \
  http://localhost:3001/api/tracking/event
# → 201: {"status": "success", "message": "Event tracked successfully"}
```

---

## 📊 API Endpoints Summary

### Public (No Auth)

- `GET /` - API info
- `GET /health` - Health check

### Users (Cassandra)

- `GET /api/users` - List users _(any key)_
- `POST /api/users` - Create user _(test/prod key)_
- `GET /api/users/:id` - Get user _(any key)_
- `PUT /api/users/:id` - Update user _(test/prod key)_
- `DELETE /api/users/:id` - Delete user _(test/prod key)_

### Tracking (Cassandra)

- `POST /api/tracking/event` - Track event _(any key)_
- `POST /api/tracking/batch` - Batch track _(any key)_
- `GET /api/tracking/events` - Get events _(any key)_

### Analytics (Cassandra data)

- `GET /api/analytics/clicks` - Click stats _(any key)_
- `GET /api/analytics/views` - View stats _(any key)_
- `GET /api/analytics/popular-services` - Service stats _(any key)_
- `GET /api/analytics/dashboard` - Dashboard _(any key)_

### API Keys (Cassandra)

- `GET /api/keys` - List keys _(test/prod key)_
- `POST /api/keys` - Create key _(test/prod key)_
- `GET /api/keys/stats` - Key stats _(test/prod key)_

---

## 🎯 Next Steps

1. ✅ **Setup Complete** - Server + Cassandra running
2. ✅ **Test Basic APIs** - Health check, users, tracking
3. ✅ **Create Dynamic Keys** - Via CLI or API
4. ✅ **Test Full Workflow** - Create user → Track events → View analytics
5. ✅ **Production Ready** - All data persisted in Cassandra

**🚀 Happy tracking với Cassandra! 🎉**

---

## 🎯 Mục đích

API track user behavior trên website với Cassandra database:

- ✅ **Click tracking** - Ảnh, bài đánh giá, bài blog, buttons
- ✅ **View tracking** - Page views, content views
- ✅ **Analytics** - Thống kê clicks, popular services
- ✅ **User management** - CRUD users với Cassandra
- ✅ **API Key management** - Dynamic keys
- ✅ **Cassandra Integration** - High-performance NoSQL database

---

## ❌ Xử lý lỗi "API key is required"

### Khi gặp lỗi này:

```json
{
  "status": "error",
  "message": "API key is required",
  "error": "Missing API key in request headers (x-api-key) or query parameter (api_key)"
}
```

### 🔑 Nguyên nhân và cách khắc phục:

#### 1. **Thiếu API key trong request**

- **Nguyên nhân**: Không gửi API key trong header hoặc query parameter
- **Cách khắc phục**: Thêm header `x-api-key` hoặc query param `?api_key=`

#### 2. **API key lấy ở đâu?**

**Option 1: Sử dụng API keys có sẵn (file .env):**

```bash
# Demo key (chỉ đọc dữ liệu)
demo_api_key_abcdefg

# Test key (full quyền)
test_api_key_xyz

# Production key (full quyền)
tracking_api_key_123456789
```

**Option 2: Tạo API key động:**

```bash
# Tạo key mới qua CLI
npm run key:create -- -n "My Website" -u "https://mysite.com" -t "production"

# Output sẽ cho bạn API key mới:
# 🔑 API Key: api_key_1737462000000_abc123xyz
```

#### 3. **Cách sử dụng API key:**

**Trong header (Khuyến nghị):**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
```

**Trong query parameter:**

```bash
curl http://localhost:3001/api/users?api_key=demo_api_key_abcdefg
```

**Trong Postman:**

- Headers tab → Key: `x-api-key` → Value: `demo_api_key_abcdefg`

---

## 📋 Hướng dẫn Step-by-Step với Postman

### Bước 1: Setup Environment trong Postman

1. **Mở Postman** → **Environments** → **Create Environment**
2. **Tạo Environment mới** với tên "User Tracking API"
3. **Thêm các variables:**

```
BASE_URL = http://localhost:3001
DEMO_KEY = demo_api_key_abcdefg
TEST_KEY = test_api_key_xyz
PROD_KEY = tracking_api_key_123456789
```

4. **Save Environment** và **Select** environment này

### Bước 2: Khởi động Server

```bash
# Option 1: Script tự động
./run_api.sh

# Option 2: Thủ công
npm install
docker-compose up -d  # Khởi động Cassandra
npm start            # Khởi động API server
```

**Kiểm tra server đã chạy:**

- Mở browser: `http://localhost:3001`
- Hoặc Postman: `GET {{BASE_URL}}/`

### Bước 3: Test API không cần Authentication

**3.1. Health Check:**

```
Method: GET
URL: {{BASE_URL}}/
Headers: (không cần)
```

**3.2. API Info:**

```
Method: GET
URL: {{BASE_URL}}/health
Headers: (không cần)
```

### Bước 4: Test API với Authentication

**4.1. Get All Users:**

```
Method: GET
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{DEMO_KEY}}
```

**Expected Response:**

```json
{
  "status": "success",
  "data": [
    {
      "id": "user_id",
      "name": "User Name",
      "email": "user@email.com"
    }
  ]
}
```

**4.2. Create User (cần full permission):**

```
Method: POST
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "name": "Test User",
  "email": "test@example.com"
}
```

### Bước 5: Test Tracking API

**5.1. Track Event:**

```
Method: POST
URL: {{BASE_URL}}/api/tracking/event
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "user_id": "user_123",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://mysite.com/gallery",
  "element_id": "img_001",
  "metadata": {
    "source": "postman_test"
  }
}
```

**5.2. Get Tracked Events:**

```
Method: GET
URL: {{BASE_URL}}/api/tracking/events
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  user_id: user_123
  limit: 10
```

### Bước 6: Test Analytics API

**6.1. Click Analytics:**

```
Method: GET
URL: {{BASE_URL}}/api/analytics/clicks
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  element_type: image
```

**6.2. View Analytics:**

```
Method: GET
URL: {{BASE_URL}}/api/analytics/views
Headers:
  x-api-key: {{DEMO_KEY}}
```

**6.3. Popular Services:**

```
Method: GET
URL: {{BASE_URL}}/api/analytics/popular-services
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  period: 7d
```

### Bước 7: Test Dynamic API Keys

**7.1. Tạo API Key mới:**

```bash
# Chạy trong terminal
npm run key:create -- -n "Postman Test" -u "https://test.com" -t "production"

# Copy API key từ output: api_key_1737462000000_abc123xyz
```

**7.2. Update Postman Environment:**

- Thêm variable: `DYNAMIC_KEY = api_key_1737462000000_abc123xyz`

**7.3. Test với Dynamic Key:**

```
Method: GET
URL: {{BASE_URL}}/api/keys/stats
Headers:
  x-api-key: {{DYNAMIC_KEY}}
```

### Bước 8: Troubleshooting Common Issues

**8.1. Port 3001 đã được sử dụng:**

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
npm start
```

**8.2. Cassandra không kết nối được:**

```bash
# Check Cassandra container
docker-compose ps

# Restart Cassandra
docker-compose restart cassandra

# Check logs
docker-compose logs cassandra
```

**8.3. API key không work:**

- Kiểm tra spelling: `x-api-key` (có dấu gạch ngang)
- Kiểm tra value: không có space thừa
- Test với demo key: `demo_api_key_abcdefg`

### Bước 9: Complete Test Flow

**Workflow hoàn chỉnh:**

1. **Setup**: Environment variables trong Postman
2. **Health Check**: Test `/` và `/health` endpoints
3. **Authentication**: Test với demo key
4. **CRUD Operations**: Create/Read users
5. **Tracking**: Track events
6. **Analytics**: View statistics
7. **Dynamic Keys**: Create và test API keys mới

---

## 🔑 API Keys

### Development Keys (có sẵn trong .env)

```bash
demo_api_key_abcdefg       # Read-only (GET endpoints)
test_api_key_xyz           # Full access
tracking_api_key_123456789 # Full access
```

### 🚨 API Key Usage Rules

| API Key Type   | Users CRUD     | Tracking | Analytics | Notes                |
| -------------- | -------------- | -------- | --------- | -------------------- |
| **Demo**       | ❌ (Read Only) | ✅       | ✅        | Chỉ GET requests     |
| **Test**       | ✅             | ✅       | ✅        | Full CRUD operations |
| **Production** | ✅             | ✅       | ✅        | Full CRUD operations |

### 🔧 Cách sử dụng API Keys

**1. Trong Request Headers (Khuyến nghị):**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
```

**2. Trong Query Parameter:**

```bash
curl "http://localhost:3001/api/users?api_key=demo_api_key_abcdefg"
```

**3. Trong Postman:**

- Headers tab → Key: `x-api-key` → Value: `demo_api_key_abcdefg`

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

### 🔄 Tạo Dynamic API Key cho Testing

#### Step 1: Tạo API key mới

```bash
npm run key:create -- -n "My Postman Tests" -u "https://postman-test.com" -t "production" -d "Key for Postman testing"

# Output sẽ hiển thị:
# ✅ API Key created successfully!
# 🔑 API Key: api_key_1737462000000_abc123xyz
# 📊 ID: 1
# 🌐 Website: My Postman Tests
```

#### Step 2: Copy API key vào Postman Environment

1. Mở Postman → Environments → Your Environment
2. Thêm/Update variable: `DYNAMIC_KEY = api_key_1737462000000_abc123xyz`
3. Save Environment

#### Step 3: Test với Dynamic Key

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

#### 👥 Users API (Cassandra integrated)

- `GET /api/users` - Lấy danh sách users từ Cassandra
- `GET /api/users/:id` - Lấy user theo ID từ Cassandra
- `POST /api/users` - Tạo user mới trong Cassandra _(cần permission 'users')_
- `PUT /api/users/:id` - Cập nhật user trong Cassandra _(cần permission 'users')_
- `DELETE /api/users/:id` - Xóa user khỏi Cassandra _(cần permission 'users')_

#### 📊 Tracking API (Cassandra integrated)

- `POST /api/tracking/event` - Track single event vào Cassandra
- `POST /api/tracking/batch` - Track multiple events vào Cassandra
- `GET /api/tracking/events` - Lấy tracked events từ Cassandra (có filter)

#### 📈 Analytics API (Cassandra data)

- `GET /api/analytics/clicks` - Thống kê clicks từ Cassandra data
- `GET /api/analytics/views` - Thống kê page views từ Cassandra
- `GET /api/analytics/popular-services` - Dịch vụ phổ biến từ Cassandra
- `GET /api/analytics/dashboard` - Dashboard tổng hợp từ Cassandra

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

## 🧪 Test với Postman - Complete Guide

### 🔧 Setup Environment (Bước bắt buộc)

1. **Mở Postman** → **Environments** → **Create Environment**
2. **Tạo Environment** với tên "User Tracking API"
3. **Thêm variables:**

| Variable      | Value                        | Description           |
| ------------- | ---------------------------- | --------------------- |
| `BASE_URL`    | `http://localhost:3001`      | Server address        |
| `DEMO_KEY`    | `demo_api_key_abcdefg`       | Read-only key         |
| `TEST_KEY`    | `test_api_key_xyz`           | Full access key       |
| `PROD_KEY`    | `tracking_api_key_123456789` | Production key        |
| `DYNAMIC_KEY` | `<từ-cli-output>`            | Dynamic generated key |

4. **Save** và **Select** environment này

### 📝 Test Requests với Postman

#### 1. Health Check (No Auth Required)

```
Method: GET
URL: {{BASE_URL}}/
Headers: (none)

Expected Response (200):
{
  "message": "User Behavior Tracking API is running!",
  "version": "1.0.0",
  "status": "healthy"
}
```

#### 2. Get Users (Read Permission)

```
Method: GET
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{DEMO_KEY}}

Expected Response (200):
{
  "status": "success",
  "data": [
    {
      "id": "uuid-string",
      "name": "User Name",
      "email": "user@email.com",
      "created_at": "2025-01-22T10:30:00.000Z"
    }
  ]
}
```

#### 3. Create User (Write Permission Required)

```
Method: POST
URL: {{BASE_URL}}/api/users
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "name": "Postman Test User",
  "email": "postman@test.com"
}

Expected Response (201):
{
  "status": "success",
  "data": {
    "id": "generated-uuid",
    "name": "Postman Test User",
    "email": "postman@test.com",
    "created_at": "2025-01-22T..."
  }
}
```

#### 4. Track Event (Cassandra Storage)

```
Method: POST
URL: {{BASE_URL}}/api/tracking/event
Headers:
  x-api-key: {{TEST_KEY}}
  Content-Type: application/json
Body (raw JSON):
{
  "user_id": "user_123",
  "event_type": "click",
  "element_type": "image",
  "page_url": "https://mysite.com/gallery",
  "element_id": "img_001",
  "metadata": {
    "source": "postman_test",
    "campaign": "winter_sale"
  }
}

Expected Response (201):
{
  "status": "success",
  "message": "Event tracked successfully",
  "data": {
    "event_id": "generated-uuid",
    "timestamp": "2025-01-22T..."
  }
}
```

#### 5. Get Analytics Data (Cassandra Query)

```
Method: GET
URL: {{BASE_URL}}/api/analytics/clicks
Headers:
  x-api-key: {{DEMO_KEY}}
Query Params:
  element_type: image
  limit: 10

Expected Response (200):
{
  "status": "success",
  "data": {
    "summary": {
      "image": {
        "total_clicks": 145,
        "unique_users": 23,
        "items": [...]
      }
    },
    "details": [...],
    "total_clicks": 145
  }
}
```

### 🔄 Dynamic API Key Testing

#### Step 1: Tạo Dynamic Key

```bash
# Terminal command
npm run key:create -- -n "Postman Dynamic Test" -u "https://dynamic-test.com" -t "production"

# Copy output API key: api_key_1737462000000_abc123xyz
```

#### Step 2: Update Postman Environment

- Variable: `DYNAMIC_KEY`
- Value: `api_key_1737462000000_abc123xyz` (từ CLI output)

#### Step 3: Test Dynamic Key

```
Method: GET
URL: {{BASE_URL}}/api/keys/stats
Headers:
  x-api-key: {{DYNAMIC_KEY}}

Expected Response (200):
{
  "status": "success",
  "data": {
    "total": 4,
    "active": 4,
    "byType": {
      "production": 1,
      "demo": 1,
      "test": 2
    }
  }
}
```

### 🚨 Common Errors & Solutions

#### Error 1: API Key Required

```json
{
  "status": "error",
  "message": "API key is required"
}
```

**Solution:** Add header `x-api-key: {{DEMO_KEY}}`

#### Error 2: Insufficient Permissions

```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

**Solution:** Use `{{TEST_KEY}}` instead of `{{DEMO_KEY}}`

#### Error 3: Connection Refused

```json
{
  "status": "error",
  "message": "connect ECONNREFUSED"
}
```

**Solution:**

```bash
# Check server is running
npm start

# Check port
curl http://localhost:3001/
```

### 📊 Complete Test Collection

**Import này vào Postman:**

```json
{
  "info": {
    "name": "User Tracking API - Cassandra",
    "description": "Complete test collection"
  },
  "item": [
    {
      "name": "1. Health Check",
      "request": {
        "method": "GET",
        "url": "{{BASE_URL}}/"
      }
    },
    {
      "name": "2. Get Users",
      "request": {
        "method": "GET",
        "url": "{{BASE_URL}}/api/users",
        "header": [{ "key": "x-api-key", "value": "{{DEMO_KEY}}" }]
      }
    },
    {
      "name": "3. Create User",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/api/users",
        "header": [
          { "key": "x-api-key", "value": "{{TEST_KEY}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"Postman User\",\"email\":\"postman@test.com\"}"
        }
      }
    },
    {
      "name": "4. Track Event",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/api/tracking/event",
        "header": [
          { "key": "x-api-key", "value": "{{TEST_KEY}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"user_id\":\"user_123\",\"event_type\":\"click\",\"element_type\":\"image\",\"page_url\":\"https://test.com\"}"
        }
      }
    },
    {
      "name": "5. Analytics - Clicks",
      "request": {
        "method": "GET",
        "url": "{{BASE_URL}}/api/analytics/clicks",
        "header": [{ "key": "x-api-key", "value": "{{DEMO_KEY}}" }]
      }
    }
  ]
}
```

### 🎯 Testing Workflow

1. **Setup Environment** ✅
2. **Health Check** → Verify server running
3. **Auth Test** → Test with DEMO_KEY
4. **CRUD Test** → Create/Read users with TEST_KEY
5. **Tracking Test** → Track events to Cassandra
6. **Analytics Test** → Query Cassandra data
7. **Dynamic Key Test** → Create & test new keys

---

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

## 🛡️ Database & Architecture

### 🗄️ Cassandra Integration

**Database**: Apache Cassandra 4.1 (via Docker)
**Keyspace**: `user_logs`
**Connection**: cassandra-driver v4.8.0

**Tables:**

- `users` - User information with UUID primary keys
- `websites` - Website configurations
- `api_keys` - Dynamic API key management
- `user_events` - Event tracking (partitioned by user_id)
- `events_by_date` - Time-series analytics (partitioned by date)

**Features:**

- ✅ High-performance NoSQL storage
- ✅ Automatic partitioning for scalability
- ✅ UUID-based primary keys
- ✅ Time-series optimization
- ✅ Connection pooling & health checks

### 🔑 Permissions Matrix

| API Key Type   | Users CRUD     | Tracking | Analytics | API Key Mgmt |
| -------------- | -------------- | -------- | --------- | ------------ |
| **Demo**       | ❌ (Read Only) | ✅       | ✅        | ❌           |
| **Test**       | ✅             | ✅       | ✅        | ✅           |
| **Production** | ✅             | ✅       | ✅        | ✅           |
| **Dynamic**    | ✅             | ✅       | ✅        | ✅           |

**Lưu ý**: Demo keys chỉ có quyền READ, không thể CREATE/UPDATE/DELETE users.

---

## 🔧 Troubleshooting

### 🚨 Lỗi "API key is required" (401)

**Nguyên nhân:**

- Không có header `x-api-key` hoặc query param `api_key`
- API key bị sai spelling hoặc format

**Cách khắc phục:**

```bash
# Cách 1: Thêm header (khuyến nghị)
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users

# Cách 2: Query parameter
curl "http://localhost:3001/api/users?api_key=demo_api_key_abcdefg"

# Cách 3: Postman
# Headers tab → Key: x-api-key → Value: demo_api_key_abcdefg
```

### 🚨 Lỗi "Insufficient permissions" (403)

**Nguyên nhân:**

- Demo key không thể tạo/sửa/xóa users
- API key bị disable hoặc expired

**Cách khắc phục:**

- Dùng `test_api_key_xyz` hoặc `tracking_api_key_123456789`
- Tạo dynamic key: `npm run key:create`

### 🚨 Lỗi Connection/Port Issues

**Port 3001 đã được sử dụng:**

```bash
# Kill process trên port 3001
lsof -ti:3001 | xargs kill -9
npm start
```

**Cassandra connection failed:**

```bash
# Check Cassandra container
docker-compose ps

# Restart Cassandra
docker-compose restart cassandra

# View logs
docker-compose logs cassandra
```

**Database schema not found:**

```bash
# Recreate database
docker-compose down -v
docker-compose up -d
```

### 🚨 Script Permission Issues

```bash
# Script run_api.sh permission denied
chmod +x run_api.sh
./run_api.sh
```

### 🚨 Postman Testing Issues

**Headers không được gửi:**

- Check spelling: `x-api-key` (có dấu gạch ngang)
- Check space: không có space thừa trong value
- Check environment: đã select đúng environment chưa

**Dynamic key không work:**

```bash
# Verify key exists
npm run key:list

# Check key details
npm run key:check -- <your-api-key>

# Create new key if needed
npm run key:create -- -n "Test" -u "https://test.com" -t "production"
```

---

## ✅ Success Indicators

### 🎯 Khi chạy `./run_api.sh` thành công:

```
🎉 ALL TESTS PASSED! (7/7)
✅ API is working perfectly!
🌐 Server running at: http://localhost:3001
✅ Connected to Cassandra successfully
```

### 🧪 Test thủ công thành công:

**1. Health Check:**

```bash
curl http://localhost:3001/
# → Status 200: {"message": "API is running", "status": "healthy"}
```

**2. Database Connection:**

```bash
curl http://localhost:3001/health
# → Status 200: {"database": "connected", "cassandra": "healthy"}
```

**3. API với Authentication:**

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/users
# → Status 200: {"status": "success", "data": [...]}
```

**4. Event Tracking:**

```bash
curl -X POST \
  -H "x-api-key: test_api_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","event_type":"click","element_type":"button","page_url":"https://test.com"}' \
  http://localhost:3001/api/tracking/event
# → Status 201: {"status": "success", "message": "Event tracked successfully"}
```

### 🎯 Cassandra Integration Success:

**Server logs hiển thị:**

```
🔄 Connecting to Cassandra...
✅ Connected to Cassandra successfully
🚀 Server is running at http://localhost:3001
```

**Database queries work:**

- User CRUD operations lưu vào Cassandra
- Event tracking lưu vào user_events table
- Analytics queries từ Cassandra data
- API key management hoạt động

**🚀 Khi thấy các indicators trên → API với Cassandra sẵn sàng sử dụng!**

---

## 📞 Contact & Support

**Project**: User Behavior Tracking API with Cassandra
**Version**: 2.0.0 (Cassandra Integrated)
**Documentation**: Updated January 2025

**Need help?**

- Check troubleshooting section above
- Review API endpoint documentation
- Test with provided Postman collection
- Verify Cassandra connection status

**🎯 Happy tracking! 🚀**
