# Cassandra Database Resilience & Auto-Recovery Guide

## 📖 Tổng quan

Hệ thống đã được cải tiến với khả năng tự phục hồi mạnh mẽ khi có sự cố về database Cassandra. Các tính năng chính:

- **Tự động reconnect** khi mất kết nối
- **Health monitoring** liên tục
- **Retry mechanism** cho các query bị lỗi
- **Graceful degradation** khi một số nodes bị down
- **API endpoints** để monitor và test hệ thống

## 🔧 Các thay đổi chính

### 1. Cấu hình Database Connection

**File: `backend/config/database/init.js`**

- Thêm health check tự động mỗi 10 giây
- Cải thiện retry logic với exponential backoff
- Thay đổi consistency level mặc định từ `localQuorum` về `one` để tăng khả năng phục hồi
- Tăng timeout và delay cho stability

### 2. Environment Configuration

**File: `.env.cassandra`**

```bash
# Cấu hình mới cho resilience
CASSANDRA_CONSISTENCY_LEVEL=one  # Thay đổi từ localQuorum
CASSANDRA_READ_TIMEOUT=12000     # Tăng từ 10000
CASSANDRA_RETRY_ATTEMPTS=5       # Tăng từ 3
CASSANDRA_HEALTH_CHECK_INTERVAL=10000
CASSANDRA_MAX_RECONNECT_ATTEMPTS=10
```

### 3. Database Resilience Helper

**File: `backend/app/helpers/dbResilience.js`**

- Wrapper cho tất cả database operations
- Automatic retry với connection recovery
- Health check với auto-healing
- Batch operations với resilience

### 4. Health Check API

**File: `backend/app/routes/health.js`**

- `GET /health` - Tổng quan health status
- `GET /health/database` - Chi tiết database cluster
- `POST /health/database/reconnect` - Force reconnection
- `GET /health/resilience-test` - Test khả năng phục hồi

## 🚀 Cách sử dụng

### 1. Khởi động hệ thống

```bash
# Load environment variables
cp .env.cassandra .env

# Start Cassandra cluster
docker-compose up -d

# Start application
npm start
```

### 2. Kiểm tra health status

```bash
# Basic health check
curl http://localhost:3002/health

# Detailed database info
curl http://localhost:3002/health/database

# Test resilience
curl http://localhost:3002/health/resilience-test
```

### 3. Test khả năng tự phục hồi

#### Option 1: Sử dụng script test

```bash
# Test đơn lẻ
node test-resilience.js --single

# Test liên tục (5s interval)
node test-resilience.js --continuous

# Test nhanh (2s interval)
node test-resilience.js --continuous --fast

# Xem hướng dẫn
node test-resilience.js --help
```

#### Option 2: Test thủ công

1. **Khởi động continuous test:**

   ```bash
   node test-resilience.js --continuous
   ```

2. **Tắt node 1:**
   ```bash
   docker stop cassandra_node1
   ```
3. **Tắt node 2:**
   ```bash
   docker stop cassandra_node2
   ```
4. **Khôi phục nodes:**

   ```bash
   docker start cassandra_node1
   docker start cassandra_node2
   ```

5. **Quan sát logs để thấy auto-recovery**

## 📊 Monitoring & Debugging

### Health Check Endpoints

#### 1. Basic Health

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "database": {
    "connected": true,
    "connectedHosts": 3,
    "message": "Connected to 3 host(s)"
  },
  "server": {
    "uptime": 3600,
    "memory": {...},
    "pid": 12345
  }
}
```

#### 2. Database Details

```bash
GET /health/database
```

**Response:**

```json
{
  "status": "healthy",
  "cluster": {
    "totalHosts": 3,
    "connectedHosts": 3,
    "hosts": [
      {
        "address": "127.0.0.1:9042",
        "datacenter": "datacenter1",
        "rack": "rack1",
        "status": "UP"
      }
    ]
  },
  "performance": {
    "queryTime": "15ms"
  }
}
```

#### 3. Force Reconnection

```bash
POST /health/database/reconnect
```

#### 4. Resilience Test

```bash
GET /health/resilience-test
```

### Log Monitoring

**Các log quan trọng cần chú ý:**

```bash
# Kết nối thành công
✅ Connected to Cassandra cluster successfully
💓 Health monitoring started

# Auto-recovery
⚠️ Health check: No connected hosts, reconnecting...
✅ Query recovered on attempt 2

# Node status changes
🟢 Host up: 127.0.0.1:9042
🔴 Critical - Host down: 127.0.0.1:9042
```

## 🛠️ Sử dụng Database Resilience trong Code

### 1. Thay thế direct client calls

**Trước:**

```javascript
const client = cassandraConnection.getClient();
const result = await client.execute(query, params);
```

**Sau:**

```javascript
import dbResilience from "../helpers/dbResilience.js";
const result = await dbResilience.executeWithRetry(query, params);
```

### 2. Custom operations với retry

```javascript
const result = await dbResilience.executeOperationWithRetry(async (client) => {
  // Custom database operation
  const result1 = await client.execute(query1, params1);
  const result2 = await client.execute(query2, params2);
  return { result1, result2 };
});
```

### 3. Health check trong code

```javascript
const healthStatus = await dbResilience.healthCheck();
if (!healthStatus.healthy) {
  console.log("Database unhealthy:", healthStatus.message);
}
```

## 🔥 Scenario Testing

### Test Case 1: Tắt 1 node

```bash
docker stop cassandra_node1
# Expected: Hệ thống vẫn hoạt động bình thường
# Connected hosts: 2/3
```

### Test Case 2: Tắt 2 nodes

```bash
docker stop cassandra_node1 cassandra_node2
# Expected: Hệ thống báo lỗi nhưng vẫn cố gắng retry
# Connected hosts: 1/3
```

### Test Case 3: Khôi phục nodes

```bash
docker start cassandra_node1 cassandra_node2
# Expected: Auto-reconnect và quay về trạng thái bình thường
# Health monitoring phát hiện và reconnect tự động
```

## ⚙️ Cấu hình tùy chỉnh

### Điều chỉnh retry behavior

```javascript
// Trong dbResilience.js
const maxRetries = 5; // Số lần retry
const retryDelay = 1000; // Delay ban đầu (ms)
const exponentialMultiplier = 2; // Multiplier cho backoff
```

### Điều chỉnh health check interval

```javascript
// Trong init.js
const healthCheckInterval = 10000; // 10 seconds
```

### Consistency Level tuning

```bash
# .env.cassandra
CASSANDRA_CONSISTENCY_LEVEL=one        # Tốt nhất cho resilience
CASSANDRA_CONSISTENCY_LEVEL=localOne   # Tốt cho single DC
CASSANDRA_CONSISTENCY_LEVEL=quorum     # Cân bằng consistency/availability
```

## 🚨 Troubleshooting

### Problem: Hệ thống không tự phục hồi

**Solution:**

1. Kiểm tra logs của health check
2. Test manual reconnection: `POST /health/database/reconnect`
3. Restart application nếu cần

### Problem: Quá nhiều retry logs

**Solution:**

1. Giảm log level trong production
2. Điều chỉnh retry attempts
3. Kiểm tra network connectivity

### Problem: Performance impact từ health checks

**Solution:**

1. Tăng health check interval
2. Tối ưu hóa test query
3. Monitor resource usage

## 📈 Performance Impact

- **Health Check Overhead:** ~1-2ms mỗi 10 giây
- **Retry Overhead:** 1-5 giây trong trường hợp có lỗi
- **Memory Impact:** ~2-5MB cho connection pooling
- **Network Impact:** Minimal, chỉ khi có sự cố

## 🔮 Future Improvements

1. **Circuit Breaker Pattern** - Tạm dừng requests khi detect quá nhiều failures
2. **Metrics Collection** - Thu thập metrics cho Prometheus/Grafana
3. **Adaptive Timeouts** - Điều chỉnh timeout dựa trên network conditions
4. **Load Balancer Integration** - Tích hợp với HAProxy cho better routing
5. **Backup Connection Strategy** - Fallback sang read replicas khi primary cluster down

## 💡 Best Practices

1. **Monitor health endpoints** trong production
2. **Set up alerting** cho database connectivity issues
3. **Regular testing** của failover scenarios
4. **Log analysis** để identify patterns
5. **Capacity planning** cho retry storms
6. **Documentation** cho operational procedures

---

**Note:** Hệ thống hiện tại đã được thiết kế để handle các scenario phổ biến. Trong trường hợp cần custom behavior, có thể modify các parameters trong `dbResilience.js` và `init.js`.
