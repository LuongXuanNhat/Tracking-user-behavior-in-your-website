-- API Key Optimization Migration
-- Tạo bảng lookup tối ưu để tránh ALLOW FILTERING

USE user_behavior_analytics;

-- ====================================
-- API KEY LOOKUP TABLE (OPTIMIZED)
-- ====================================

-- Bảng lookup cho API key với api_key làm partition key
CREATE TABLE IF NOT EXISTS api_key_lookup (
    api_key TEXT PRIMARY KEY,
    website_id UUID,
    customer_id UUID,
    status TEXT,
    name TEXT,
    created_at TIMESTAMP,
    last_used TIMESTAMP
) WITH 
    gc_grace_seconds = 86400 AND
    compaction = {
        'class': 'LeveledCompactionStrategy'
    } AND
    compression = {
        'class': 'LZ4Compressor'
    };

-- ====================================
-- WEBSITE BY API KEY (DENORMALIZED)
-- ====================================

-- Bảng denormalized cho fast lookup
CREATE TABLE IF NOT EXISTS websites_by_api_key (
    api_key TEXT PRIMARY KEY,
    website_id UUID,
    customer_id UUID,
    name TEXT,
    domain TEXT,
    url TEXT,
    status TEXT,
    settings MAP<TEXT, TEXT>,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP
) WITH 
    gc_grace_seconds = 86400 AND
    compaction = {
        'class': 'LeveledCompactionStrategy'
    } AND
    compression = {
        'class': 'LZ4Compressor'
    };

-- ====================================
-- MIGRATION: POPULATE LOOKUP TABLES
-- ====================================

-- Insert existing data into lookup tables
-- (Run this manually after creating tables)

/*
-- Populate api_key_lookup from websites
INSERT INTO api_key_lookup (api_key, website_id, customer_id, status, name, created_at)
SELECT api_key, website_id, customer_id, status, name, created_at
FROM websites 
WHERE api_key IS NOT NULL;

-- Populate websites_by_api_key from websites
INSERT INTO websites_by_api_key (
    api_key, website_id, customer_id, name, domain, url, status, 
    settings, created_at, updated_at, last_activity
)
SELECT 
    api_key, website_id, customer_id, name, domain, url, status,
    settings, created_at, updated_at, last_activity
FROM websites 
WHERE api_key IS NOT NULL;
*/

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Index for reverse lookup (website_id -> api_key)
CREATE INDEX IF NOT EXISTS api_key_lookup_website_idx ON api_key_lookup (website_id);
CREATE INDEX IF NOT EXISTS api_key_lookup_customer_idx ON api_key_lookup (customer_id);
CREATE INDEX IF NOT EXISTS api_key_lookup_status_idx ON api_key_lookup (status);

-- Index for websites_by_api_key
CREATE INDEX IF NOT EXISTS websites_by_api_key_website_idx ON websites_by_api_key (website_id);
CREATE INDEX IF NOT EXISTS websites_by_api_key_customer_idx ON websites_by_api_key (customer_id);
CREATE INDEX IF NOT EXISTS websites_by_api_key_status_idx ON websites_by_api_key (status);

-- ====================================
-- SUCCESS MESSAGE
-- ====================================

SELECT 'API Key optimization tables created successfully!' as status;
