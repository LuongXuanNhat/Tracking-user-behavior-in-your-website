# Cassandra Driver Connection Behavior Explained

## Tại sao chỉ hiển thị 1 connected host?

### 1. **Driver Architecture**

Cassandra Node.js driver không cần kết nối đến TẤT CẢ nodes cùng lúc. Thay vào đó:

- Driver kết nối đến 1 node làm **coordinator**
- Node coordinator sẽ discovery các nodes khác trong cluster
- Driver sẽ tự động route requests đến node appropriate

### 2. **Connection Pool Behavior**

```javascript
coreConnectionsPerHost: {
  [distance.local]: 2,  // Mỗi LOCAL node sẽ có 2 connections
  [distance.remote]: 1, // Mỗi REMOTE node sẽ có 1 connection
}
```

**Thực tế:**

- Driver chỉ establish connections khi CẦN THIẾT
- Nếu 1 connection có thể handle load hiện tại → không tạo thêm connections
- Discovery process sẽ map tất cả nodes, nhưng chỉ connect khi needed

### 3. **Load Balancing Strategy**

- **DCAwareRoundRobinPolicy**: Ưu tiên local datacenter nodes
- Driver sẽ tự động distribute queries across available nodes
- Không cần maintain persistent connections đến tất cả nodes

### 4. **Failover Mechanism**

#### Khi 1 node down:

1. **Driver detection**: Host down event được trigger
2. **Automatic retry**: Driver retry query với node khác
3. **Connection rebalancing**: Establish new connections nếu cần
4. **Health monitoring**: Periodic check để detect khi node back up

## Testing Failover

### Scenario 1: Node hiện tại down

```bash
# Tắt node đang kết nối
docker stop cassandra_node3

# Application sẽ:
# 1. Detect connection failure
# 2. Trigger hostDown event
# 3. Automatic reconnect to available node
# 4. Continue operations without interruption
```

### Scenario 2: Multiple nodes down

- Với replication factor = 3, có thể chịu được 1 node down
- Với 2 nodes down, vẫn có thể read/write (tùy consistency level)
- Driver tự động adjust query routing

## Optimal Configuration

### Production Settings:

```javascript
pooling: {
  coreConnectionsPerHost: {
    [distance.local]: 2,    // Sufficient cho most workloads
    [distance.remote]: 1,
  },
  maxConnectionsPerHost: {
    [distance.local]: 8,    // Allow scaling under high load
    [distance.remote]: 2,
  }
},
queryOptions: {
  consistency: cassandra.types.consistencies.localQuorum, // Balance performance/consistency
  readTimeout: 8000,
  prepare: true,
}
```

### Key Points:

1. **Don't force multiple connections** - Let driver optimize
2. **Focus on proper failover testing** - Actual resilience matters more than connection count
3. **Monitor health events** - Use driver event listeners
4. **Use appropriate consistency levels** - Balance availability vs consistency

## Kiểm tra thực tế failover

Thay vì focus vào số connections, hãy test:

1. **Response time** khi node down
2. **Error handling** và recovery time
3. **Data consistency** sau failover
4. **Monitoring alerts** khi có issues

> **Kết luận**: 1 connected host là BÌNH THƯỜNG và hiệu quả. Driver sẽ automatically handle failover và load balancing.
