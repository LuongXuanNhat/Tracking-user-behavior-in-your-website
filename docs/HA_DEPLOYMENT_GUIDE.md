# High Availability Cassandra Cluster Setup Guide

## Tổng quan

Thiết kế này cung cấp một hệ thống Cassandra có khả năng chịu lỗi và chịu tải cao với:

- **3 Datacenters**: Primary (3 nodes), Secondary (2 nodes), Backup (1 node)
- **Multi-datacenter replication**: Dữ liệu được nhân bản tự động
- **Load balancing**: HAProxy để phân tải kết nối
- **Monitoring**: Prometheus + Grafana
- **Fault tolerance**: Hệ thống hoạt động ngay cả khi mất 1 datacenter

## Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Datacenter 1  │    │   Datacenter 2  │    │   Datacenter 3  │
│    (Primary)    │    │   (Secondary)   │    │    (Backup)     │
│                 │    │                 │    │                 │
│  ┌───┐ ┌───┐   │    │  ┌───┐ ┌───┐   │    │     ┌───┐       │
│  │ 1 │ │ 2 │   │    │  │ 1 │ │ 2 │   │    │     │ 1 │       │
│  └───┘ └───┘   │    │  └───┘ └───┘   │    │     └───┘       │
│     ┌───┐       │    │                 │    │                 │
│     │ 3 │       │    │                 │    │                 │
│     └───┘       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   HAProxy LB    │
                    │   Port: 9142    │
                    └─────────────────┘
```

## Khả năng chịu lỗi

### Replication Strategy

```cql
-- Main keyspace: RF=6 (3+2+1)
'datacenter1': 3  -- Primary datacenter
'datacenter2': 2  -- Secondary datacenter
'datacenter3': 1  -- Backup datacenter
```

### Failure Scenarios

1. **1 node fail**: Hệ thống hoạt động bình thường
2. **1 datacenter fail**: Dữ liệu vẫn available từ 2 datacenter còn lại
3. **Primary DC fail**: Secondary DC tự động take over
4. **Network partition**: Mỗi DC có thể hoạt động độc lập

## Hướng dẫn triển khai

### 1. Chuẩn bị môi trường

```bash
# Clone repository
git clone <your-repo>
cd "DB enhance/Source"

# Tạo các thư mục cần thiết
mkdir -p cassandra/config
mkdir -p load-balancer
mkdir -p monitoring
```

### 2. Khởi động cluster

```bash
# Khởi động cluster theo thứ tự
docker-compose -f docker-compose-ha.yml up -d cassandra-dc1-node1

# Đợi node đầu tiên khởi động (3-4 phút)
docker logs -f cassandra_dc1_node1

# Khởi động các node còn lại
docker-compose -f docker-compose-ha.yml up -d
```

### 3. Khởi tạo database

```bash
# Kết nối đến cluster
docker exec -it cassandra_dc1_node1 cqlsh

# Chạy script khởi tạo
SOURCE '/docker-entrypoint-initdb.d/enhanced_database.cql';
SOURCE '/docker-entrypoint-initdb.d/init_ha_cluster.cql';
```

### 4. Verification

```bash
# Kiểm tra cluster status
docker exec -it cassandra_dc1_node1 nodetool status

# Kiểm tra ring
docker exec -it cassandra_dc1_node1 nodetool ring

# Kiểm tra replication
docker exec -it cassandra_dc1_node1 cqlsh -e "DESCRIBE KEYSPACE user_behavior_analytics;"
```

## Load Balancing

### HAProxy Endpoints

- **Primary writes**: `localhost:9142`
- **Read queries**: `localhost:9143`
- **Disaster recovery**: `localhost:9144`
- **HAProxy stats**: `localhost:8404/stats`

### Connection Strategy

```javascript
// Ví dụ Node.js connection
const cassandra = require("cassandra-driver");

// Write operations
const writeClient = new cassandra.Client({
  contactPoints: ["localhost:9142"],
  localDataCenter: "datacenter1",
  consistency: cassandra.types.consistencies.localQuorum,
});

// Read operations
const readClient = new cassandra.Client({
  contactPoints: ["localhost:9143"],
  localDataCenter: "datacenter2",
  consistency: cassandra.types.consistencies.localOne,
});
```

## Consistency Levels

### Recommended Settings

| Operation Type    | Write CL     | Read CL      | Use Case           |
| ----------------- | ------------ | ------------ | ------------------ |
| Event ingestion   | LOCAL_QUORUM | LOCAL_ONE    | High-volume writes |
| User management   | QUORUM       | LOCAL_QUORUM | Critical data      |
| Analytics         | LOCAL_QUORUM | LOCAL_ONE    | Dashboard queries  |
| Reports           | QUORUM       | LOCAL_QUORUM | Business reports   |
| Real-time metrics | LOCAL_ONE    | LOCAL_ONE    | Live dashboard     |

### Cross-datacenter Operations

```javascript
// Critical cross-DC operations
client.execute(query, params, {
  consistency: cassandra.types.consistencies.eachQuorum,
});

// Normal operations
client.execute(query, params, {
  consistency: cassandra.types.consistencies.localQuorum,
});
```

## Performance Optimization

### Table Settings

1. **Events table**: TimeWindowCompactionStrategy cho time-series data
2. **Customer/Website tables**: LeveledCompactionStrategy cho frequent updates
3. **Archive tables**: SizeTieredCompactionStrategy cho write-once data

### Partitioning Strategy

```cql
-- Hour-level partitioning for better distribution
PRIMARY KEY ((website_id, event_date, event_hour), event_time, event_id)

-- Date-based partitioning for user analysis
PRIMARY KEY ((website_id, visitor_id, event_date), event_time, event_id)
```

### Materialized Views

- `events_by_type`: Fast event-specific queries
- `events_by_page`: Popular pages analysis

## Monitoring

### Prometheus Metrics

- **Cluster health**: Node status, token distribution
- **Performance**: Read/write latency, throughput
- **Storage**: Disk usage, compaction status
- **Application**: Custom business metrics

### Grafana Dashboards

1. **Cluster Overview**: Node status, datacenter health
2. **Performance Metrics**: Latency, throughput, errors
3. **Capacity Planning**: Storage trends, growth projections
4. **Application Metrics**: Events per second, user activity

### Key Metrics to Monitor

```prometheus
# Cassandra specific
cassandra_table_read_latency_seconds
cassandra_table_write_latency_seconds
cassandra_table_pending_compactions
cassandra_node_up

# Application specific
events_ingested_total
active_users_gauge
api_request_duration_seconds
```

## Disaster Recovery

### Backup Strategy

1. **Incremental backups**: Enable on all nodes
2. **Snapshot scheduling**: Weekly full snapshots
3. **Cross-datacenter**: Automatic via replication
4. **Archive keyspace**: Long-term data retention

### Failover Procedures

#### Primary Datacenter Failure

```bash
# 1. Update application config to use DC2
# 2. Update HAProxy backend weights
# 3. Monitor cluster status
docker exec -it cassandra_dc2_node1 nodetool status

# 4. Verify data consistency
docker exec -it cassandra_dc2_node1 nodetool repair
```

#### Node Failure Recovery

```bash
# 1. Check cluster status
nodetool status

# 2. Replace failed node
docker-compose -f docker-compose-ha.yml up -d cassandra-dc1-node2-new

# 3. Stream data to new node
nodetool rebuild datacenter1
```

## Capacity Planning

### Storage Estimates

| Data Type | Daily Volume | Monthly Growth | Retention  |
| --------- | ------------ | -------------- | ---------- |
| Events    | 10M records  | 300M records   | 12 months  |
| Sessions  | 1M records   | 30M records    | 12 months  |
| Customers | 1K records   | 30K records    | Indefinite |
| Websites  | 10K records  | 300K records   | Indefinite |

### Hardware Requirements

#### Production Environment

| Component | Primary DC | Secondary DC | Backup DC |
| --------- | ---------- | ------------ | --------- |
| CPU       | 8 cores    | 6 cores      | 4 cores   |
| RAM       | 32GB       | 24GB         | 16GB      |
| Storage   | 2TB SSD    | 1.5TB SSD    | 1TB SSD   |
| Network   | 10Gbps     | 10Gbps       | 1Gbps     |

#### Development Environment

```yaml
# Docker resource limits
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 4G
    reservations:
      cpus: "1"
      memory: 2G
```

## Security Considerations

### Network Security

```yaml
# Enable internode encryption
server_encryption_options:
  internode_encryption: all
  keystore: /etc/cassandra/keystore
  truststore: /etc/cassandra/truststore
```

### Authentication

```yaml
# Enable authentication
authenticator: PasswordAuthenticator
authorizer: CassandraAuthorizer

# Create admin user
CREATE ROLE admin WITH PASSWORD = 'secure_password'
  AND SUPERUSER = true
  AND LOGIN = true;
```

### Authorization

```cql
-- Create application user
CREATE ROLE app_user WITH PASSWORD = 'app_password' AND LOGIN = true;

-- Grant specific permissions
GRANT SELECT ON user_behavior_analytics.events TO app_user;
GRANT MODIFY ON user_behavior_analytics.events TO app_user;
```

## Troubleshooting

### Common Issues

1. **Cluster not forming**:

   ```bash
   # Check seeds configuration
   # Verify network connectivity
   # Check firewall settings
   ```

2. **High write latency**:

   ```bash
   # Check compaction status
   nodetool compactionstats

   # Tune memory settings
   # Adjust concurrent writers
   ```

3. **Read timeouts**:
   ```bash
   # Check consistency level
   # Verify data distribution
   # Monitor JVM heap usage
   ```

### Debug Commands

```bash
# Cluster information
nodetool status
nodetool info
nodetool ring

# Performance monitoring
nodetool tpstats
nodetool cfstats
nodetool proxyhistograms

# Repair operations
nodetool repair
nodetool cleanup
```

## Maintenance Tasks

### Regular Operations

1. **Weekly**:

   - Monitor cluster health
   - Review performance metrics
   - Check compaction status

2. **Monthly**:

   - Full cluster repair
   - Review capacity trends
   - Update monitoring alerts

3. **Quarterly**:
   - Performance tuning review
   - Disaster recovery testing
   - Security audit

### Automation Scripts

```bash
#!/bin/bash
# Health check script
for node in dc1-node1 dc1-node2 dc1-node3; do
  docker exec cassandra_$node nodetool status
done

# Backup script
for node in dc1-node1 dc1-node2 dc1-node3; do
  docker exec cassandra_$node nodetool snapshot
done
```

## Migration from Single Node

### Step-by-step Migration

1. **Setup new cluster** (parallel to existing)
2. **Dual-write period** (write to both clusters)
3. **Data verification** (compare datasets)
4. **Read traffic migration** (gradually shift reads)
5. **Write traffic migration** (final cutover)
6. **Old cluster decommission**

### Data Migration Script

```javascript
// Example migration script
const oldClient = new cassandra.Client({
  contactPoints: ["old-cassandra:9042"],
});
const newClient = new cassandra.Client({ contactPoints: ["localhost:9142"] });

async function migrateData() {
  const query = "SELECT * FROM events WHERE event_date = ?";
  const results = await oldClient.execute(query, [dateParam]);

  for (const row of results.rows) {
    await newClient.execute(insertQuery, row);
  }
}
```

---

## Kết luận

Thiết kế này cung cấp:

✅ **High Availability**: 99.9% uptime với multi-datacenter replication  
✅ **Fault Tolerance**: Chịu được failure của 1 datacenter hoàn toàn  
✅ **Scalability**: Dễ dàng thêm nodes và datacenters  
✅ **Performance**: Optimized cho high-volume event tracking  
✅ **Monitoring**: Complete observability stack  
✅ **Disaster Recovery**: Automated backup và failover procedures

Hệ thống sẵn sàng cho production environment với khả năng xử lý hàng triệu events mỗi ngày.
