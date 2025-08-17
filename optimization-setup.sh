#!/bin/bash
# optimization-setup.sh
# Script để áp dụng các tối ưu hóa Cassandra cho xử lý tải cao

echo "🚀 Cassandra High Load Optimization Setup"
echo "========================================"

# 1. Restart cluster với cấu hình mới
echo "📍 Step 1: Restarting Cassandra cluster with optimized configuration..."
docker-compose down
docker system prune -f
docker-compose up -d

# 2. Chờ cluster khởi động
echo "📍 Step 2: Waiting for cluster to be ready..."
sleep 60

# 3. Kiểm tra cluster health
echo "📍 Step 3: Checking cluster health..."
docker exec cassandra_node1 nodetool status

# 4. Áp dụng schema optimizations
echo "📍 Step 4: Applying schema optimizations..."
if [ -f "./cassandra/migration/03_api_key_optimization.cql" ]; then
    echo "Applying API key optimization migration..."
    docker cp ./cassandra/migration/03_api_key_optimization.cql cassandra_node1:/opt/migration.cql
    docker exec cassandra_node1 cqlsh -f /opt/migration.cql
    echo "✅ API key optimization migration applied"
else
    echo "⚠️ API key optimization migration file not found"
fi

# 5. Populate lookup tables (if main tables have data)
echo "📍 Step 5: Populating lookup tables..."
docker exec -i cassandra_node1 cqlsh << 'EOF'
USE user_behavior_analytics;

-- Check if we have existing data
SELECT COUNT(*) FROM websites;

-- Populate lookup tables if data exists
INSERT INTO api_key_lookup (api_key, website_id, customer_id, status, name, created_at)
SELECT api_key, website_id, customer_id, status, name, created_at
FROM websites 
WHERE api_key IS NOT NULL;

INSERT INTO websites_by_api_key (
    api_key, website_id, customer_id, name, domain, url, status, 
    settings, created_at, updated_at, last_activity
)
SELECT 
    api_key, website_id, customer_id, name, domain, url, status,
    settings, created_at, updated_at, last_activity
FROM websites 
WHERE api_key IS NOT NULL;

-- Verify data population
SELECT COUNT(*) as api_key_lookup_count FROM api_key_lookup;
SELECT COUNT(*) as websites_by_api_key_count FROM websites_by_api_key;
EOF

# 6. Test performance
echo "📍 Step 6: Testing API key lookup performance..."
docker exec -i cassandra_node1 cqlsh << 'EOF'
USE user_behavior_analytics;

-- Test optimized queries (these should be much faster)
TIMING ON;

-- This should use partition key lookup (fast)
SELECT * FROM api_key_lookup WHERE api_key = 'test-key' LIMIT 1;

-- This should also be fast
SELECT * FROM websites_by_api_key WHERE api_key = 'test-key' LIMIT 1;

-- Compare with slow query (for reference)
-- SELECT * FROM websites WHERE api_key = 'test-key' ALLOW FILTERING;
EOF

# 7. Configure HAProxy
echo "📍 Step 7: Restarting HAProxy with optimized configuration..."
docker-compose restart haproxy

# 8. Show status
echo "📍 Step 8: Final status check..."
echo ""
echo "🔍 Cluster Status:"
docker exec cassandra_node1 nodetool status

echo ""
echo "🔍 HAProxy Status:"
curl -s http://localhost:8405/health && echo " - Health check: OK" || echo " - Health check: FAILED"

echo ""
echo "🔍 Connection Info:"
echo "  - Write operations: localhost:9142"
echo "  - Read operations: localhost:9143" 
echo "  - Disaster recovery: localhost:9144"
echo "  - HAProxy stats: http://localhost:8404/stats"
echo "  - Cassandra Web UI: http://localhost:3010"

echo ""
echo "✅ Optimization setup completed!"
echo ""
echo "📋 Performance Tips:"
echo "  1. Use the load-balanced endpoints (9142, 9143) in production"
echo "  2. Monitor HAProxy stats at http://localhost:8404/stats"
echo "  3. API key lookups should now be much faster"
echo "  4. Consider adding Redis cache for even better performance"
echo ""
