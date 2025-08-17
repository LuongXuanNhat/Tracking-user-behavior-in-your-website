#!/bin/bash

# Migration script để populate api_key_websites table
echo "🚀 Starting API key lookup table migration..."

# 1. Kiểm tra Cassandra connection
echo "📍 Step 1: Checking Cassandra connection..."
docker exec -i cassandra_node1 cqlsh << 'EOF'
SELECT cluster_name FROM system.local;
EOF

if [ $? -ne 0 ]; then
    echo "❌ Cassandra connection failed. Please start Cassandra first."
    exit 1
fi

# 2. Create optimized table
echo "📍 Step 2: Creating api_key_websites table..."
docker exec -i cassandra_node1 cqlsh < cassandra/migration/04_api_key_fast_lookup.cql

# 3. Migrate data from websites table
echo "📍 Step 3: Migrating data from websites table..."
docker exec -i cassandra_node1 cqlsh << 'EOF'
USE user_behavior_analytics;

-- Populate api_key_websites từ websites table
INSERT INTO api_key_websites (
    api_key, website_id, customer_id, name, domain, url, status, 
    settings, created_at, updated_at, last_activity
)
SELECT 
    api_key, website_id, customer_id, name, domain, url, status,
    settings, created_at, updated_at, last_activity
FROM websites 
WHERE api_key IS NOT NULL AND api_key != '';

-- Verify migration
SELECT COUNT(*) as migrated_records FROM api_key_websites;
EOF

# 4. Test performance
echo "📍 Step 4: Testing query performance..."
docker exec -i cassandra_node1 cqlsh << 'EOF'
USE user_behavior_analytics;
TIMING ON;

-- Test fast lookup (should be very fast)
SELECT COUNT(*) FROM api_key_websites;

-- Test sample lookup
SELECT * FROM api_key_websites LIMIT 5;
EOF

echo "✅ Migration completed successfully!"
echo "🔍 Next steps:"
echo "  1. Restart your application to use the new optimized query"
echo "  2. Monitor performance improvements"
echo "  3. Remove old ALLOW FILTERING queries once confirmed working"
