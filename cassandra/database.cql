-- Advanced Cassandra Schema for User Behavior Tracking System
-- Fixed version with proper Cassandra constraints

-- Create keyspace with NetworkTopologyStrategy for production
CREATE KEYSPACE IF NOT EXISTS user_behavior_analytics
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3
};

USE user_behavior_analytics;

-- ====================================
-- CORE ENTITIES
-- ====================================

-- Customers/Tenants table
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    company TEXT,
    plan TEXT, -- free, premium, enterprise
    status TEXT, -- active, suspended, inactive
    settings MAP<TEXT, TEXT>,
    password_hash TEXT, -- for customer authentication
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
);

-- Websites/Properties table (belongs to customers)
CREATE TABLE IF NOT EXISTS websites (
    website_id UUID PRIMARY KEY,
    customer_id UUID,
    name TEXT,
    domain TEXT,
    url TEXT,
    status TEXT, -- active, inactive, suspended
    settings MAP<TEXT, TEXT>, -- tracking settings, privacy config
    api_key TEXT, -- changed from SET<TEXT> to TEXT
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP
);

-- ====================================
-- USER TRACKING TABLES
-- ====================================

-- Visitors table (fixed - removed counters from complex partition)
CREATE TABLE IF NOT EXISTS visitors (
    visitor_id UUID PRIMARY KEY,
    website_id UUID,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    session_count BIGINT, -- changed from COUNTER
    page_views BIGINT, -- changed from COUNTER
    total_time_spent BIGINT, -- in seconds
    device_info MAP<TEXT, TEXT>,
    location_info MAP<TEXT, TEXT>,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

-- ====================================
-- EVENT TRACKING TABLES
-- ====================================

-- Primary events table - partitioned by website and date for write optimization
CREATE TABLE IF NOT EXISTS events (
    website_id UUID,
    event_date TEXT, -- YYYY-MM-DD
    event_time TIMESTAMP,
    event_id UUID,
    visitor_id UUID,
    user_id UUID, -- null for anonymous
    session_id UUID,
    event_type TEXT, -- pageview, click, scroll, form_submit, purchase, etc.
    event_name TEXT, -- specific event name
    page_url TEXT,
    page_title TEXT,
    element_selector TEXT,
    element_text TEXT,
    properties MAP<TEXT, TEXT>, -- custom event properties
    device_type TEXT, -- desktop, mobile, tablet
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    PRIMARY KEY ((website_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Events by user - for user journey analysis
CREATE TABLE IF NOT EXISTS events_by_user (
    website_id UUID,
    visitor_id UUID,
    event_time TIMESTAMP,
    event_id UUID,
    session_id UUID,
    event_type TEXT,
    event_name TEXT,
    page_url TEXT,
    properties MAP<TEXT, TEXT>,
    PRIMARY KEY ((website_id, visitor_id), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Events by session - for session analysis
CREATE TABLE IF NOT EXISTS events_by_session (
    website_id UUID,
    session_id UUID,
    event_time TIMESTAMP,
    event_id UUID,
    visitor_id UUID,
    event_type TEXT,
    event_name TEXT,
    page_url TEXT,
    duration_since_start BIGINT, -- milliseconds since session start
    properties MAP<TEXT, TEXT>,
    PRIMARY KEY ((website_id, session_id), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time ASC);

-- Events by type - for event-specific analytics
CREATE TABLE IF NOT EXISTS events_by_type (
    website_id UUID,
    event_type TEXT,
    event_date TEXT,
    event_time TIMESTAMP,
    event_id UUID,
    visitor_id UUID,
    session_id UUID,
    page_url TEXT,
    properties MAP<TEXT, TEXT>,
    PRIMARY KEY ((website_id, event_type), event_date, event_time, event_id)
) WITH CLUSTERING ORDER BY (event_date DESC, event_time DESC);


-- ====================================
-- INDEXES FOR OPTIMIZATION (Fixed)
-- ====================================

-- Secondary indexes for common queries
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);

CREATE INDEX IF NOT EXISTS websites_customer_idx ON websites (customer_id);
CREATE INDEX IF NOT EXISTS websites_domain_idx ON websites (domain);
CREATE INDEX IF NOT EXISTS websites_api_key_idx ON websites (api_key);

-- CREATE INDEX IF NOT EXISTS identified_users_website_idx ON identified_users (website_id);
-- CREATE INDEX IF NOT EXISTS identified_users_external_idx ON identified_users (external_user_id);

-- Note: Avoid creating too many secondary indexes on high-cardinality columns
-- as they can impact write performance

-- Show final schema
DESCRIBE KEYSPACE user_behavior_analytics;