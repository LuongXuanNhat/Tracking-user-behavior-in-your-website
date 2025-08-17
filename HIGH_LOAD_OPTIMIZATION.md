# Cassandra High Load Optimization Guide

## 📋 Tổng quan

Hướng dẫn này giải quyết vấn đề **timeout** khi có lượng truy cập lớn vào Cassandra bằng cách:

1. **Tối ưu connection pooling** và timeouts
2. **Cải thiện HAProxy load balancing**
3. **Tăng resource limits** cho Cassandra cluster
4. **Tạo lookup tables** để tránh `ALLOW FILTERING`
5. **Sử dụng consistency levels** phù hợp

## 🚀 Áp dụng Optimizations

### Bước 1: Backup dữ liệu hiện tại

```bash
# Tạo backup trước khi optimize
./backup/run_backup.sh
```

### Bước 2: Áp dụng optimizations

```bash
# Cấp quyền execute cho script
chmod +x optimization-setup.sh

# Chạy script optimization
./optimization-setup.sh
```

### Bước 3: Sử dụng production environment

```bash
# Copy production config
cp .env.production .env

# Restart application với config mới
npm run restart
```

## 🎯 Các cải thiện chính

### 1. Connection Pool Optimization

- **Tăng connection pool**: 4-8 connections per node
- **Heartbeat interval**: 30 seconds
- **Read timeout**: 30 seconds (tăng từ 12s)
- **Connection timeout**: 20 seconds (tăng từ 5s)

### 2. HAProxy Load Balancing

- **Max connections**: 8,192 (tăng từ 4,096)
- **Timeout optimization**: 60s client/server timeout
- **Health check**: 3s interval với failover nhanh
- **Separate endpoints**:
  - `9142`: Write operations (primary)
  - `9143`: Read operations (optimized)
  - `9144`: Disaster recovery

### 3. Cassandra Cluster Resources

- **Heap size**: 1GB (tăng từ 512MB)
- **Concurrent reads/writes**: 32 (tăng từ 16)
- **Request timeouts**: 30s read, 20s write
- **Compaction throughput**: 64MB/s

### 4. Database Schema Optimization

- **API Key Lookup Tables**:
  - `api_key_lookup`: Fast primary key lookup
  - `websites_by_api_key`: Denormalized data
- **Indexes**: Optimized secondary indexes
- **Consistency**: LOCAL_ONE for reads, LOCAL_QUORUM for writes

## 📊 Performance Monitoring

### HAProxy Stats

- URL: http://localhost:8404/stats
- Username: `admin`
- Password: `secure_password_2025`

### Cassandra Web UI

- URL: http://localhost:3010

### Health Checks

```bash
# HAProxy health
curl http://localhost:8405/health

# Cluster status
docker exec cassandra_node1 nodetool status

# Connection test
docker exec cassandra_node1 cqlsh -e "SELECT COUNT(*) FROM user_behavior_analytics.websites;"
```

## 🔧 Troubleshooting

### Timeout vẫn xảy ra

1. **Kiểm tra cluster health**:

```bash
docker exec cassandra_node1 nodetool status
docker exec cassandra_node1 nodetool tpstats
```

2. **Monitor connections**:

```bash
# Xem connections qua HAProxy
curl http://localhost:8404/stats
```

3. **Kiểm tra logs**:

```bash
docker logs cassandra_node1
docker logs cassandra_load_balancer
```

### API Key queries chậm

1. **Verify lookup tables**:

```sql
USE user_behavior_analytics;
SELECT COUNT(*) FROM api_key_lookup;
SELECT COUNT(*) FROM websites_by_api_key;
```

2. **Check query patterns**:

```sql
-- Fast query (should use partition key)
SELECT * FROM api_key_lookup WHERE api_key = 'your-key';

-- Slow query (avoid if possible)
SELECT * FROM websites WHERE api_key = 'your-key' ALLOW FILTERING;
```

### Memory issues

1. **Tăng heap size** trong docker-compose.yml:

```yaml
- MAX_HEAP_SIZE=2048M
- HEAP_NEWSIZE=512M
```

2. **Monitor memory usage**:

```bash
docker stats cassandra_node1 cassandra_node2 cassandra_node3
```

## 📈 Expected Performance Improvements

| Metric            | Before        | After           | Improvement          |
| ----------------- | ------------- | --------------- | -------------------- |
| API Key Lookup    | 12s+ timeout  | <100ms          | 99%+ faster          |
| Connection Pool   | 2 connections | 4-8 connections | 4x capacity          |
| Timeout Tolerance | 12s           | 30s             | 150% more resilient  |
| Load Distribution | Single point  | 3-node cluster  | 3x distribution      |
| Health Check      | Manual        | Automated       | Real-time monitoring |

## 🎉 Verification

Sau khi áp dụng optimizations, test performance:

```bash
# Test API endpoint
curl -H "x-api-key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"event_type":"test","page_url":"https://test.com"}' \
     http://localhost:3002/api/tracking/events

# Measure response time
time curl -H "x-api-key: your-api-key" \
          http://localhost:3002/api/tracking/health
```

Response time nên giảm từ >12s xuống <1s cho API key validation.
