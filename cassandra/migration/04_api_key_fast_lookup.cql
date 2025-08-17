-- ====================================
-- MIGRATION: FAST API KEY LOOKUP TABLE
-- ====================================
-- Tạo table tối ưu cho API key lookup để thay thế ALLOW FILTERING

USE user_behavior_analytics;

-- Table chính để lookup API key nhanh (partition key = api_key)
CREATE TABLE IF NOT EXISTS api_key_websites (
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
        'class': 'LeveledCompactionStrategy',
        'sstable_size_in_mb': 160
    } AND
    compression = {
        'class': 'LZ4Compressor'
    } AND
    memtable_flush_period_in_ms = 60000 AND
    bloom_filter_fp_chance = 0.01;

-- Index để reverse lookup (từ website_id tìm api_key)
CREATE INDEX IF NOT EXISTS api_key_websites_website_idx ON api_key_websites (website_id);
CREATE INDEX IF NOT EXISTS api_key_websites_customer_idx ON api_key_websites (customer_id);
CREATE INDEX IF NOT EXISTS api_key_websites_status_idx ON api_key_websites (status);

-- ====================================
-- MIGRATE DATA FROM EXISTING TABLES
-- ====================================

-- Populate api_key_websites từ websites table
-- Chạy lệnh này để migrate data:
/*
INSERT INTO api_key_websites (
    api_key, website_id, customer_id, name, domain, url, status, 
    settings, created_at, updated_at, last_activity
)
SELECT 
    api_key, website_id, customer_id, name, domain, url, status,
    settings, created_at, updated_at, last_activity
FROM websites 
WHERE api_key IS NOT NULL AND api_key != '';
*/

-- ====================================
-- PERFORMANCE TEST QUERIES
-- ====================================

-- Test fast lookup (should be very fast - partition key lookup)
-- SELECT * FROM api_key_websites WHERE api_key = 'your-api-key';

-- Test reverse lookup (should also be fast with index)
-- SELECT * FROM api_key_websites WHERE website_id = uuid() ALLOW FILTERING;

-- ====================================
-- SUCCESS MESSAGE
-- ====================================

-- SELECT 'Fast API key lookup table created successfully!' as status,
--        'Run the migration script to populate data' as next_step;
