-- Database initialization script for High Availability Cassandra Cluster
-- Run this after cluster is fully operational

-- ====================================
-- VERIFICATION COMMANDS
-- ====================================

-- Check cluster status
DESCRIBE CLUSTER;

-- Check datacenter and rack information
SELECT data_center, rack, host_id, release_version 
FROM system.peers;

-- Check keyspace replication
SELECT keyspace_name, replication 
FROM system_schema.keyspaces 
WHERE keyspace_name IN ('user_behavior_analytics', 'user_behavior_archive', 'user_behavior_realtime');

-- ====================================
-- KEYSPACE CREATION WITH MULTI-DC REPLICATION
-- ====================================

-- Main analytics keyspace
CREATE KEYSPACE IF NOT EXISTS user_behavior_analytics
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3  -- Single DC: 3 replicas (matches 3-node cluster)
} AND durable_writes = true;

-- Archive keyspace (reduced replication for cost optimization)
CREATE KEYSPACE IF NOT EXISTS user_behavior_archive
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 2  -- Reduced replicas for archived data
} AND durable_writes = true;

-- Real-time keyspace (high replication for availability)
CREATE KEYSPACE IF NOT EXISTS user_behavior_realtime
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3  -- High replication for availability
} AND durable_writes = true;

-- ====================================
-- VERIFY KEYSPACE CREATION
-- ====================================

USE user_behavior_analytics;

-- Verify tables exist and check their configuration
DESCRIBE TABLES;

-- Check specific table configuration
DESCRIBE TABLE events;

-- ====================================
-- INITIAL DATA VERIFICATION
-- ====================================

-- Check if any data exists
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM websites;
SELECT COUNT(*) FROM events;

-- ====================================
-- CONSISTENCY LEVEL TESTING
-- ====================================

-- Test writes with different consistency levels
-- These commands would be run from application code:

/*
Recommended consistency levels for different operations:

1. HIGH-VOLUME WRITES (Events):
   - Event ingestion: QUORUM (2 out of 3 nodes)
   - Real-time buffer: ONE (fast writes)
   - Session data: QUORUM

2. METADATA OPERATIONS (Customers, Websites):
   - CREATE/UPDATE: QUORUM
   - READ: QUORUM

3. ANALYTICS QUERIES:
   - Dashboard: ONE (with caching)
   - Reports: QUORUM
   - Real-time metrics: ONE

4. SINGLE DATACENTER DEPLOYMENT:
   - Critical operations: ALL (all 3 nodes)
   - Normal operations: QUORUM (2 out of 3 nodes)
   - Reads: ONE or QUORUM based on consistency needs

5. DISASTER RECOVERY:
   - Failover reads: ONE
   - Emergency writes: ANY (with repair)
*/
   - Emergency writes: ANY (with repair)
*/

-- ====================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ====================================

-- Check compaction strategies
SELECT keyspace_name, table_name, compaction 
FROM system_schema.tables 
WHERE keyspace_name = 'user_behavior_analytics';

-- Check compression settings
SELECT keyspace_name, table_name, compression 
FROM system_schema.tables 
WHERE keyspace_name = 'user_behavior_analytics';

-- ====================================
-- MONITORING QUERIES
-- ====================================

-- Check node status
SELECT * FROM system.peers;

-- Check token ranges
SELECT tokens FROM system.local;

-- Check hints
-- (This would be done via nodetool: nodetool status)

-- ====================================
-- SAMPLE DATA INSERTION FOR TESTING
-- ====================================

-- Insert test customer
INSERT INTO customers (
    customer_id, name, email, company, plan, status, 
    created_at, updated_at
) VALUES (
    uuid(), 'Test Company', 'test@example.com', 'Test Corp', 
    'premium', 'active', toTimestamp(now()), toTimestamp(now())
);

-- Verify insertion worked across all datacenters
-- (Check from each datacenter's node)

-- ====================================
-- BACKUP VERIFICATION
-- ====================================

-- Test archive keyspace
USE user_behavior_archive;
DESCRIBE TABLES;

-- Test real-time keyspace  
USE user_behavior_realtime;
DESCRIBE TABLES;

-- ====================================
-- MATERIALIZED VIEW VERIFICATION
-- ====================================

USE user_behavior_analytics;

-- Check materialized views
SELECT * FROM system_schema.views;

-- Verify materialized view data consistency
-- (This should be done after inserting test events)

-- ====================================
-- FINAL VERIFICATION COMMANDS
-- ====================================

-- Check cluster health
-- Run from cqlsh: CONSISTENCY;
-- Run from nodetool: nodetool status
-- Run from nodetool: nodetool ring
-- Run from nodetool: nodetool describecluster

-- Performance baseline queries
-- Run these to establish performance baselines:

/*
-- Simple read test
SELECT * FROM events WHERE website_id = ? AND event_date = ? LIMIT 100;

-- Aggregation test  
SELECT COUNT(*) FROM events WHERE website_id = ? AND event_date = ?;

-- Cross-partition query test
SELECT * FROM events_by_user WHERE website_id = ? AND visitor_id = ? LIMIT 50;

-- Materialized view test
SELECT * FROM events_by_type WHERE website_id = ? AND event_type = 'pageview' LIMIT 100;
*/

-- ====================================
-- SUCCESS MESSAGE
-- ====================================

-- If all commands above succeed, the cluster is ready for production use
SELECT 'High Availability Cassandra Cluster initialized successfully!' as status;
