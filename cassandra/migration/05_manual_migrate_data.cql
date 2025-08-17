-- Manual migration script để populate api_key_websites
USE user_behavior_analytics;

-- Insert sample data (từ kết quả query trên)
INSERT INTO api_key_websites (
    api_key, website_id, customer_id, name, domain, url, status,
    created_at, updated_at, last_activity
) VALUES (
    'production_nhthbeauty_1755399753812_4xgodk9p9ap',
    4afffa0c-74c8-412a-95ca-dec12ec572cb,
    780d7d46-3831-45eb-8b45-9b4c877e274f,
    'Như Thị Beauty',
    null,
    'http://localhost:3000/',
    'active',
    '2025-08-17 03:02:33.814+0000',
    '2025-08-17 03:02:33.814+0000',
    null
);

-- Verify the insert



DROP TABLE IF EXISTS realtime_metrics;
DROP TABLE IF EXISTS websites_by_id;
-- DROP TABLE IF EXISTS api_key_websites;