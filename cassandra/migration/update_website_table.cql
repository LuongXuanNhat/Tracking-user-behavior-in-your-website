USE user_behavior_analytics;

DROP TABLE IF EXISTS websites;

-- hoặc tạo lại bảng:
CREATE TABLE IF NOT EXISTS websites (
    website_id UUID PRIMARY KEY,
    customer_id UUID,
    name TEXT,
    domain TEXT,
    url TEXT,
    status TEXT,
    settings MAP<TEXT, TEXT>,
    api_key TEXT, -- đã đổi từ SET<TEXT> sang TEXT
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP
);


-- Tạo chỉ mục cho trường api_key
CREATE INDEX IF NOT EXISTS api_key_index ON websites (api_key);

-- 1.0.1
ALTER TABLE customers ADD password_hash text;

-- Update value for password_hash
UPDATE customers 
SET password_hash = '$2b$10$zgb7tA/2W4A2sJavBY39W.g6uRxIWNKKOK0/pGzhBKknXzeEIfp3m'
WHERE customer_id = 69d69874-d1eb-4904-9874-a91b1496a5c0;
