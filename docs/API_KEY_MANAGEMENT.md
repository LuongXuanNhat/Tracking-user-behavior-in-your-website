# API Key Management System

Hệ thống quản lý API Keys động cho ứng dụng tracking user behavior.

## 🎯 Tổng quan

Thay vì hard-code API keys trong `.env`, hệ thống mới cho phép:

- **Tạo API keys động** từ database/memory store
- **Quản lý lifecycle** của từng key (tạo, vô hiệu hóa, gia hạn)
- **Kiểm soát quyền truy cập** chi tiết theo endpoint
- **Theo dõi usage statistics** và security
- **CLI tools** để quản lý keys dễ dàng

## 🔧 Cài đặt Dependencies

```bash
npm install commander dotenv
```

## 🚀 Sử dụng CLI Tools

### 1. Tạo API Key mới

```bash
# Tạo production key
npm run key:create -- -n "My Website" -u "https://example.com" -t production

# Tạo demo key
npm run key:create -- -n "Demo Site" -u "https://demo.example.com" -t demo -d "Demo key for testing"
```

### 2. Liệt kê API Keys

```bash
# Xem tất cả keys
npm run key:list

# Lọc theo type
npm run key:list -- --type production

# Lọc theo status
npm run key:list -- --status active
```

### 3. Kiểm tra API Key

```bash
npm run key:check -- tk_1734806400000_abc123def456
```

### 4. Vô hiệu hóa API Key

```bash
npm run key:disable -- 1 --reason "Security breach"
```

### 5. Xem thống kê

```bash
npm run key:stats
```

## 🌐 API Endpoints

### 1. Tạo API Key (POST /api/keys)

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -d '{
    "websiteName": "Example Website",
    "websiteUrl": "https://example.com",
    "type": "production",
    "description": "Main website key"
  }'
```

### 2. Lấy danh sách keys (GET /api/keys)

```bash
curl -H "x-api-key: YOUR_ADMIN_KEY" \
  "http://localhost:3001/api/keys?type=production&page=1&limit=10"
```

### 3. Xem thống kê (GET /api/keys/stats)

```bash
curl -H "x-api-key: YOUR_ADMIN_KEY" \
  "http://localhost:3001/api/keys/stats"
```

### 4. Vô hiệu hóa key (PUT /api/keys/:id/disable)

```bash
curl -X PUT http://localhost:3001/api/keys/1/disable \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -d '{"reason": "Security concerns"}'
```

### 5. Gia hạn key (PUT /api/keys/:id/extend)

```bash
curl -X PUT http://localhost:3001/api/keys/1/extend \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -d '{"extensionDays": 365}'
```

## 🔐 Security Features

### 1. API Key Format

```
tk_[timestamp]_[random_hex]
Example: tk_1734806400000_abc123def456789
```

### 2. Permissions System

```javascript
{
  tracking: true,    // Quyền sử dụng /api/tracking
  analytics: true,   // Quyền sử dụng /api/analytics
  users: false,      // Quyền sử dụng /api/users (chỉ production)
  rateLimit: {
    requests: 10000,
    window: 3600     // 10k requests/hour
  }
}
```

### 3. Key Types & Expiration

- **Demo**: 30 ngày, giới hạn 100 requests/hour
- **Test**: 90 ngày, giới hạn 1000 requests/hour
- **Production**: 1 năm, giới hạn 10000 requests/hour

## 📊 Monitoring

### 1. Usage Tracking

Mỗi API call được track:

- `usage_count`: Số lần sử dụng
- `last_used`: Thời gian sử dụng cuối
- `created_at`: Thời gian tạo
- `expires_at`: Thời gian hết hạn

### 2. Security Monitoring

- Invalid key attempts
- Expired key usage
- Permission violations
- Rate limit exceeded

## 🎭 Development vs Production

### Development Mode

- Vẫn support `.env` keys để backward compatibility
- API keys visible trong response
- Sample data tự động tạo

### Production Mode

- Chỉ dùng dynamic keys từ database
- API keys được mask trong response
- Strict security validation

## 📝 Migration từ .env Keys

1. **Tạo keys mới**:

```bash
npm run key:create -- -n "Production Site" -u "https://yoursite.com" -t production
```

2. **Update client code** để dùng key mới

3. **Remove .env keys** khi đã migration xong

4. **Set NODE_ENV=production** để disable .env fallback

## 🔄 Database Integration

Hiện tại sử dụng in-memory storage cho demo. Trong production, cần integrate với:

### Cassandra

```javascript
// models/ApiKey.js - Cassandra integration
import { Client } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'api_keys'
});

static async create(keyData) {
  const query = 'INSERT INTO api_keys (id, api_key, website_name, ...) VALUES (?, ?, ?, ...)';
  await client.execute(query, [uuid(), apiKey, websiteName, ...]);
}
```

### PostgreSQL/MySQL

```javascript
// models/ApiKey.js - SQL integration
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

static async create(keyData) {
  const query = 'INSERT INTO api_keys (api_key, website_name, ...) VALUES ($1, $2, ...) RETURNING *';
  const result = await pool.query(query, [apiKey, websiteName, ...]);
  return result.rows[0];
}
```

## ⚡ Performance Optimization

1. **Redis Cache**: Cache API key validation results
2. **Connection Pooling**: Cho database connections
3. **Rate Limiting**: Implement per-key rate limiting
4. **Monitoring**: APM tools cho performance tracking

## 🛡️ Best Practices

1. **Rotate keys** định kỳ (6-12 tháng)
2. **Monitor suspicious activity** (unusual usage patterns)
3. **Implement alerting** cho security events
4. **Backup key data** regularly
5. **Use HTTPS only** để protect keys in transit
6. **Log key usage** cho audit trail
