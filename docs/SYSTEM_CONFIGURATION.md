# 🛠️ API Configuration & Environment Setup

## 🔧 SYSTEM CONFIGURATION

Hệ thống API tracking đã được đơn giản hóa - chỉ sử dụng API keys từ file `.env` với middleware authentication đơn giản.

### Current Architecture:

- ✅ **Fixed API Keys**: Lưu trong file `.env`
- ✅ **Simple Middleware**: Chỉ check API key hợp lệ
- ❌ **Database Keys**: Đã bỏ (không dùng Website model)
- ❌ **Complex Permissions**: Đã đơn giản hóa

---

## 📁 ENVIRONMENT CONFIGURATION

### File `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Cassandra Configuration
CASSANDRA_HOSTS=127.0.0.1
CASSANDRA_KEYSPACE=user_logs
CASSANDRA_LOCAL_DATA_CENTER=datacenter1

# CORS Configuration
ALLOWED_ORIGINS=https://nhuthibeauty.com

# Logging
LOG_LEVEL=info

# API Keys
PRODUCTION_API_KEY=tracking_api_key_123456789
DEMO_API_KEY=demo_api_key_abcdefg
TEST_API_KEY=test_api_key_xyz
```

### API Keys được load trong middleware:

```javascript
// middlewares/apikey.js
const VALID_API_KEYS = [
  process.env.PRODUCTION_API_KEY,
  process.env.DEMO_API_KEY,
  process.env.TEST_API_KEY,
].filter(Boolean);
```

---

## 🔐 API KEY SYSTEM

### Available Keys:

| Environment | Key Value                    | Purpose               |
| ----------- | ---------------------------- | --------------------- |
| Production  | `tracking_api_key_123456789` | Full access           |
| Demo        | `demo_api_key_abcdefg`       | Read-only operations  |
| Test        | `test_api_key_xyz`           | Development & testing |

### Key Permissions:

```javascript
function getApiKeyType(apiKey) {
  if (apiKey === process.env.DEMO_API_KEY) return "demo";
  if (apiKey === process.env.TEST_API_KEY) return "test";
  if (apiKey === process.env.PRODUCTION_API_KEY) return "production";
  return "unknown";
}
```

---

## 🚀 QUICK SETUP GUIDE

### 1. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Or create .env manually with content above
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Server

```bash
npm start
# Server will start at http://localhost:3001
```

### 4. Get Available API Keys

```bash
curl http://localhost:3001/api/keys
```

**Response:**

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

---

## 🧪 TESTING API KEYS

### Test API Key Validation

```bash
# Valid key
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/validate-key

# Invalid key
curl -H "x-api-key: invalid_key" \
  http://localhost:3001/api/validate-key
```

### Test Tracking Endpoint

```bash
curl -X POST http://localhost:3001/api/tracking/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo_api_key_abcdefg" \
  -d '{
    "user_id": "test_user",
    "event_type": "click",
    "element_type": "image",
    "page_url": "https://test.com",
    "element_id": "test-img"
  }'
```

### Test Analytics Endpoint

```bash
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

---

## 🔄 MIDDLEWARE FLOW

### Request Processing:

1. **Extract API Key** from headers/query
2. **Validate** against VALID_API_KEYS array
3. **Add metadata** to request object
4. **Continue** to route handler

### Code Flow:

```javascript
export const validateApiKey = (options = {}) => {
  return (req, res, next) => {
    // Get API key from request
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "") ||
      req.query.api_key;

    // Check if valid
    if (!VALID_API_KEYS.includes(apiKey)) {
      return res.status(401).json({
        status: "error",
        message: "Invalid API key",
      });
    }

    // Add to request
    req.apiKeyValidated = true;
    req.apiKey = apiKey;
    req.apiKeyType = getApiKeyType(apiKey);

    next();
  };
};
```

---

## 📊 MONITORING & DEBUGGING

### Enable Debug Logging

```env
# In .env file
LOG_LEVEL=debug
NODE_ENV=development
```

### Check Server Health

```bash
curl http://localhost:3001/health
```

### Validate Environment

```bash
# Check if all required env vars are loaded
curl http://localhost:3001/api/keys
```

---

## 🛡️ SECURITY CONSIDERATIONS

### Best Practices:

- ✅ API keys stored in `.env` (not in code)
- ✅ Different keys for different environments
- ✅ Keys filtered out from logs in production
- ✅ CORS properly configured

### Environment Security:

```bash
# Production .env should have strong keys
PRODUCTION_API_KEY=your_secure_production_key_here
DEMO_API_KEY=your_demo_key_here
TEST_API_KEY=your_test_key_here

# Don't commit .env to git
echo ".env" >> .gitignore
```

---

## 🆘 TROUBLESHOOTING

### Common Issues:

#### 1. "Invalid API key" errors

```bash
# Check if env vars are loaded
curl http://localhost:3001/api/keys

# Restart server after .env changes
npm start
```

#### 2. "Connection refused"

```bash
# Check if server is running
curl http://localhost:3001/health

# Check port in .env
PORT=3001
```

#### 3. CORS errors

```bash
# Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
```

---

## 📈 USAGE EXAMPLES

### Frontend Integration

```html
<script>
  window.userTrackingConfig = {
    apiUrl: "http://localhost:3001/api/tracking",
    apiKey: "demo_api_key_abcdefg",
    enabled: true,
  };
</script>
```

### Backend API Calls

```javascript
// Node.js/Express
const response = await fetch("http://localhost:3001/api/analytics/clicks", {
  headers: {
    "x-api-key": process.env.TRACKING_API_KEY,
  },
});
```

### cURL Examples

```bash
# Analytics
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/dashboard

# Tracking
curl -X POST http://localhost:3001/api/tracking/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo_api_key_abcdefg" \
  -d '{"user_id":"123","event_type":"click"}'
```

---

## 🎯 CONFIGURATION REFERENCE

### Complete .env Template

```env
# ===========================================
# TRACKING API CONFIGURATION
# ===========================================

# Server Settings
PORT=3001
NODE_ENV=development

# Database (Cassandra)
CASSANDRA_HOSTS=127.0.0.1
CASSANDRA_KEYSPACE=user_logs
CASSANDRA_LOCAL_DATA_CENTER=datacenter1

# Security
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Logging
LOG_LEVEL=info

# API Authentication
PRODUCTION_API_KEY=tracking_api_key_123456789
DEMO_API_KEY=demo_api_key_abcdefg
TEST_API_KEY=test_api_key_xyz

# Optional: Custom Keys
# CUSTOM_API_KEY_1=custom_key_1
# CUSTOM_API_KEY_2=custom_key_2
```

**🎉 Hệ thống configuration đơn giản và hiệu quả!**
