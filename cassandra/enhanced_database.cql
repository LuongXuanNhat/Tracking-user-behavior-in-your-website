-- Enhanced Cassandra Schema for High Availability & High Load User Behavior Tracking System
-- Optimized for multi-datacenter deployment with fault tolerance

-- ✅ Tạo Keyspaces (user_behavior_analytics, user_behavior_archive, user_behavior_realtime)
-- ✅ Tạo TẤT CẢ các Tables (customers, websites, events, sessions, etc.)
-- ✅ Tạo Materialized Views
-- ✅ Tạo Indexes
-- ✅ Tạo User Defined Functions
-- ✅ Cấu hình tối ưu (compression, compaction, TTL)

-- ====================================
-- MULTI-DATACENTER KEYSPACE STRATEGY
-- ====================================

-- Main keyspace with single datacenter replication (matching docker-compose-ha.yml)
CREATE KEYSPACE IF NOT EXISTS user_behavior_analytics
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3  -- Single datacenter with 3 replicas (3 nodes in cluster)
} AND durable_writes = true;

-- Archive keyspace for old data (lower replication factor for cost optimization)
CREATE KEYSPACE IF NOT EXISTS user_behavior_archive
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 2  -- Reduced replicas for archived data
} AND durable_writes = true;

-- Real-time keyspace for high-frequency writes (optimized settings)
CREATE KEYSPACE IF NOT EXISTS user_behavior_realtime
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3  -- High replication for availability
} AND durable_writes = true;

USE user_behavior_analytics;

-- ====================================
-- CORE ENTITIES WITH IMPROVED PARTITIONING
-- ====================================

-- Customers table with better distribution
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    company TEXT,
    plan TEXT, -- free, premium, enterprise
    status TEXT, -- active, suspended, inactive
    settings MAP<TEXT, TEXT>,
    password_hash TEXT,
    billing_info MAP<TEXT, TEXT>,
    usage_limits MAP<TEXT, BIGINT>, -- API calls, events per month, etc.
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,
    subscription_expires_at TIMESTAMP,
    total_websites INT,
    total_events_tracked BIGINT
) WITH 
    gc_grace_seconds = 864000 AND -- 10 days
    compaction = {
        'class': 'LeveledCompactionStrategy',
        'sstable_size_in_mb': 160
    } AND
    compression = {
        'class': 'LZ4Compressor',
        'compression_level': 1
    };

-- Websites table with customer_id as partition key for better locality
CREATE TABLE IF NOT EXISTS websites (
    customer_id UUID,
    website_id UUID,
    name TEXT,
    domain TEXT,
    url TEXT,
    status TEXT,
    settings MAP<TEXT, TEXT>,
    api_key TEXT,
    tracking_code TEXT,
    daily_event_limit BIGINT,
    monthly_event_count BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP,
    PRIMARY KEY (customer_id, website_id)
) WITH 
    gc_grace_seconds = 864000 AND
    compaction = {
        'class': 'LeveledCompactionStrategy'
    };

-- Website lookup by ID (for API performance)
CREATE TABLE IF NOT EXISTS websites_by_id (
    website_id UUID PRIMARY KEY,
    customer_id UUID,
    name TEXT,
    domain TEXT,
    api_key TEXT,
    status TEXT,
    settings MAP<TEXT, TEXT>
) WITH 
    gc_grace_seconds = 864000;

-- ====================================
-- HIGH-PERFORMANCE EVENT TRACKING TABLES
-- ====================================

-- Primary events table with hour-level partitioning for better distribution
CREATE TABLE IF NOT EXISTS events (
    website_id UUID,
    event_date TEXT, -- YYYY-MM-DD
    event_hour INT,  -- 0-23, additional partition key for better distribution
    event_time TIMESTAMP,
    event_id TIMEUUID, -- Using TIMEUUID for better ordering and uniqueness
    visitor_id UUID,
    user_id UUID,
    session_id UUID,
    event_type TEXT,
    event_name TEXT,
    page_url TEXT,
    page_title TEXT,
    element_selector TEXT,
    element_text TEXT,
    properties MAP<TEXT, TEXT>,
    device_type TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    screen_resolution TEXT,
    viewport_size TEXT,
    ip_address INET, -- Using INET type for IP addresses
    country TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    page_load_time INT, -- milliseconds
    connection_type TEXT, -- 4g, wifi, etc.
    PRIMARY KEY ((website_id, event_date, event_hour), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC)
    AND gc_grace_seconds = 259200 -- 3 days for faster tombstone collection
    AND compaction = {
        'class': 'TimeWindowCompactionStrategy',
        'compaction_window_unit': 'HOURS',
        'compaction_window_size': 6, -- 6-hour time windows
        'max_threshold': 32,
        'min_threshold': 4
    }
    AND compression = {
        'class': 'LZ4Compressor'
    }
    AND memtable_flush_period_in_ms = 60000; -- Flush every minute for real-time processing

-- Events by user for user journey analysis (optimized partitioning)
CREATE TABLE IF NOT EXISTS events_by_user (
    website_id UUID,
    visitor_id UUID,
    event_date TEXT, -- Additional partition for better distribution
    event_time TIMESTAMP,
    event_id TIMEUUID,
    session_id UUID,
    event_type TEXT,
    event_name TEXT,
    page_url TEXT,
    page_title TEXT,
    properties MAP<TEXT, TEXT>,
    device_type TEXT,
    country TEXT,
    PRIMARY KEY ((website_id, visitor_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC)
    AND gc_grace_seconds = 259200
    AND compaction = {
        'class': 'TimeWindowCompactionStrategy',
        'compaction_window_unit': 'DAYS',
        'compaction_window_size': 1
    };

-- Sessions table for session-based analytics
CREATE TABLE IF NOT EXISTS sessions (
    website_id UUID,
    session_date TEXT, -- YYYY-MM-DD
    session_id UUID,
    visitor_id UUID,
    user_id UUID,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INT,
    page_views INT,
    bounce BOOLEAN,
    entry_page TEXT,
    exit_page TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    events_count INT,
    conversion_events SET<TEXT>, -- Track conversion events in this session
    PRIMARY KEY ((website_id, session_date), start_time, session_id)
) WITH CLUSTERING ORDER BY (start_time DESC)
    AND gc_grace_seconds = 864000
    AND compaction = {
        'class': 'TimeWindowCompactionStrategy',
        'compaction_window_unit': 'DAYS',
        'compaction_window_size': 7
    };

-- Real-time aggregations table for dashboard metrics
CREATE TABLE IF NOT EXISTS realtime_metrics (
    website_id UUID,
    metric_type TEXT, -- page_views, unique_visitors, conversions, etc.
    time_window TEXT, -- 1m, 5m, 15m, 1h
    timestamp TIMESTAMP,
    metric_value BIGINT,
    additional_data MAP<TEXT, TEXT>,
    PRIMARY KEY ((website_id, metric_type, time_window), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
    AND gc_grace_seconds = 86400 -- 1 day
    AND compaction = {
        'class': 'TimeWindowCompactionStrategy',
        'compaction_window_unit': 'HOURS',
        'compaction_window_size': 1
    }
    AND default_time_to_live = 604800; -- 7 days TTL for real-time metrics

-- ====================================
-- MATERIALIZED VIEWS FOR READ OPTIMIZATION
-- ====================================

-- Events by type for fast event-specific queries
CREATE MATERIALIZED VIEW IF NOT EXISTS events_by_type AS
    SELECT website_id, event_type, event_date, event_hour, event_time, event_id, 
           visitor_id, session_id, page_url, properties, device_type, country
    FROM events
    WHERE website_id IS NOT NULL 
        AND event_date IS NOT NULL 
        AND event_hour IS NOT NULL
        AND event_time IS NOT NULL 
        AND event_id IS NOT NULL
        AND event_type IS NOT NULL
    PRIMARY KEY ((website_id, event_type), event_date, event_hour, event_time, event_id)
    WITH CLUSTERING ORDER BY (event_date DESC, event_hour DESC, event_time DESC);

-- Popular pages materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS events_by_page AS
    SELECT website_id, page_url, event_date, event_hour, event_time, event_id,
           visitor_id, session_id, event_type, device_type, country
    FROM events
    WHERE website_id IS NOT NULL 
        AND event_date IS NOT NULL 
        AND event_hour IS NOT NULL
        AND event_time IS NOT NULL 
        AND event_id IS NOT NULL
        AND page_url IS NOT NULL
    PRIMARY KEY ((website_id, page_url), event_date, event_hour, event_time, event_id)
    WITH CLUSTERING ORDER BY (event_date DESC, event_hour DESC, event_time DESC);

-- ====================================
-- ARCHIVE TABLES FOR DATA LIFECYCLE MANAGEMENT
-- ====================================

USE user_behavior_archive;

-- Archive table for old events (same structure but in archive keyspace)
CREATE TABLE IF NOT EXISTS events_archive (
    website_id UUID,
    event_date TEXT,
    event_hour INT,
    event_time TIMESTAMP,
    event_id TIMEUUID,
    visitor_id UUID,
    user_id UUID,
    session_id UUID,
    event_type TEXT,
    event_name TEXT,
    page_url TEXT,
    page_title TEXT,
    element_selector TEXT,
    element_text TEXT,
    properties MAP<TEXT, TEXT>,
    device_type TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    ip_address INET,
    country TEXT,
    region TEXT,
    city TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    PRIMARY KEY ((website_id, event_date, event_hour), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC)
    AND compaction = {
        'class': 'SizeTieredCompactionStrategy', -- Better for write-once, read-rarely data
        'max_threshold': 32,
        'min_threshold': 4
    }
    AND compression = {
        'class': 'DeflateCompressor' -- Higher compression for archived data
    };

-- ====================================
-- REAL-TIME TABLES
-- ====================================

USE user_behavior_realtime;

-- Real-time events buffer for immediate processing
CREATE TABLE IF NOT EXISTS events_buffer (
    website_id UUID,
    bucket INT, -- 0-99 for load distribution
    event_time TIMESTAMP,
    event_id TIMEUUID,
    raw_data TEXT, -- JSON string for flexible schema
    processed BOOLEAN,
    retry_count INT,
    PRIMARY KEY ((website_id, bucket), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time ASC) -- FIFO processing
    AND gc_grace_seconds = 86400 -- 1 day
    AND default_time_to_live = 3600 -- 1 hour TTL
    AND compaction = {
        'class': 'SizeTieredCompactionStrategy'
    };

-- Active visitors for real-time dashboard
CREATE TABLE IF NOT EXISTS active_visitors (
    website_id UUID,
    visitor_id UUID,
    last_seen TIMESTAMP,
    current_page TEXT,
    session_id UUID,
    device_type TEXT,
    country TEXT,
    PRIMARY KEY (website_id, visitor_id)
) WITH default_time_to_live = 1800 -- 30 minutes TTL
    AND gc_grace_seconds = 86400;

-- ====================================
-- OPTIMIZED INDEXES
-- ====================================

USE user_behavior_analytics;

-- Indexes for customer management
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);
CREATE INDEX IF NOT EXISTS customers_plan_idx ON customers (plan);

-- Indexes for website management  
CREATE INDEX IF NOT EXISTS websites_by_id_customer_idx ON websites_by_id (customer_id);
CREATE INDEX IF NOT EXISTS websites_by_id_domain_idx ON websites_by_id (domain);
CREATE INDEX IF NOT EXISTS websites_by_id_api_key_idx ON websites_by_id (api_key);

-- ====================================
-- USER DEFINED FUNCTIONS FOR ANALYTICS
-- ====================================

-- Function to extract hour from timestamp
CREATE OR REPLACE FUNCTION extract_hour(ts TIMESTAMP)
CALLED ON NULL INPUT
RETURNS INT
LANGUAGE java
AS $$
    java.util.Calendar cal = java.util.Calendar.getInstance();
    cal.setTimeInMillis(ts.getTime());
    return cal.get(java.util.Calendar.HOUR_OF_DAY);
$$;

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_duration(start_time TIMESTAMP, end_time TIMESTAMP)
CALLED ON NULL INPUT
RETURNS INT
LANGUAGE java
AS $$
    if (start_time == null || end_time == null) return 0;
    return (int)((end_time.getTime() - start_time.getTime()) / 1000);
$$;

-- ====================================
-- CONSISTENCY LEVEL RECOMMENDATIONS
-- ====================================

/*
For optimal performance with this schema, use these consistency levels:

WRITES (Events, high-volume data):
- Use QUORUM for most writes (2 out of 3 nodes)
- Use LOCAL_QUORUM for same-datacenter operations
- Use ANY for non-critical real-time events (with async repair)

READS (Analytics queries):
- Use QUORUM for dashboard queries (2 out of 3 nodes)
- Use ONE for real-time metrics (acceptable for slight inconsistency)
- Use QUORUM for critical business reports

SINGLE DATACENTER DEPLOYMENT:
- Use QUORUM for consistency (2 out of 3 nodes must respond)
- Use ONE for fast reads when consistency is not critical
- Use ALL for critical writes (all 3 nodes must respond)

Example application settings:
- Event ingestion: QUORUM write, ONE read
- Analytics queries: QUORUM for both
- Real-time dashboard: ONE for both (with caching)
- Business reports: QUORUM for both
*/

-- ====================================
-- TABLE SETTINGS SUMMARY
-- ====================================

/*
Key optimizations implemented:

1. PARTITIONING:
   - Hour-level partitioning for events (better distribution)
   - Date-based partitioning for time-series data
   - Bucket-based partitioning for real-time ingestion

2. COMPACTION:
   - TimeWindowCompactionStrategy for time-series data
   - LeveledCompactionStrategy for frequently updated data
   - SizeTieredCompactionStrategy for archive data

3. COMPRESSION:
   - LZ4 for active tables (fast compression/decompression)
   - Deflate for archive tables (high compression ratio)

4. TTL & GC:
   - Short GC grace periods for high-write tables
   - TTL for temporary/cache tables
   - Longer retention for business-critical data

5. MATERIALIZED VIEWS:
   - Automatic denormalization for common query patterns
   - Improved read performance for analytics

6. MULTI-KEYSPACE STRATEGY:
   - Separate keyspaces for different access patterns
   - Different replication factors based on importance
   - Archive strategy for data lifecycle management
*/

DESCRIBE KEYSPACE user_behavior_analytics;
DESCRIBE KEYSPACE user_behavior_archive;
DESCRIBE KEYSPACE user_behavior_realtime;
