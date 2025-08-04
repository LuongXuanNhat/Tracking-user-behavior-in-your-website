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
