-- Advanced Cassandra Schema for User Behavior Tracking System
-- Designed for multi-tenant, high-performance analytics

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
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);

-- Websites/Properties table (belongs to customers)
CREATE TABLE IF NOT EXISTS websites (
    website_id UUID PRIMARY KEY,
    customer_id UUID,
    name TEXT,
    domain TEXT,
    url TEXT,
    status TEXT, -- active, inactive, suspended
    settings MAP<TEXT, TEXT>, -- tracking settings, privacy config
    api_keys SET<TEXT>, -- multiple API keys per website
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_activity TIMESTAMP
);

CREATE INDEX IF NOT EXISTS websites_customer_idx ON websites (customer_id);
CREATE INDEX IF NOT EXISTS websites_domain_idx ON websites (domain);

-- API Keys management
CREATE TABLE IF NOT EXISTS api_keys (
    api_key TEXT PRIMARY KEY,
    website_id UUID,
    customer_id UUID,
    name TEXT,
    permissions SET<TEXT>, -- read, write, admin
    rate_limit INT,
    status TEXT, -- active, revoked, expired
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    last_used TIMESTAMP,
    usage_count COUNTER
);

CREATE INDEX IF NOT EXISTS api_keys_website_idx ON api_keys (website_id);

-- ====================================
-- USER TRACKING TABLES
-- ====================================

-- Visitors table (anonymous users before identification)
CREATE TABLE IF NOT EXISTS visitors (
    visitor_id UUID PRIMARY KEY,
    website_id UUID,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    session_count COUNTER,
    page_views COUNTER,
    total_time_spent BIGINT, -- in seconds
    device_info MAP<TEXT, TEXT>,
    location_info MAP<TEXT, TEXT>,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

-- Identified users (after login/registration)
CREATE TABLE IF NOT EXISTS identified_users (
    user_id UUID PRIMARY KEY,
    website_id UUID,
    external_user_id TEXT, -- customer's user ID
    email TEXT,
    properties MAP<TEXT, TEXT>, -- custom user properties
    first_identified TIMESTAMP,
    last_activity TIMESTAMP,
    visitor_id UUID, -- link to anonymous visitor
    lifetime_value DECIMAL,
    segment TEXT
);

CREATE INDEX IF NOT EXISTS identified_users_website_idx ON identified_users (website_id);
CREATE INDEX IF NOT EXISTS identified_users_external_idx ON identified_users (external_user_id);

-- ====================================
-- EVENT TRACKING TABLES (Optimized for different query patterns)
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
-- SESSION TRACKING
-- ====================================

-- Sessions table for session-level analytics
CREATE TABLE IF NOT EXISTS sessions (
    website_id UUID,
    session_date TEXT, -- YYYY-MM-DD
    session_id UUID,
    visitor_id UUID,
    user_id UUID,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration BIGINT, -- seconds
    page_views COUNTER,
    events_count COUNTER,
    bounce BOOLEAN, -- single page session
    conversion BOOLEAN, -- achieved goal
    entry_page TEXT,
    exit_page TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    country TEXT,
    PRIMARY KEY ((website_id, session_date), start_time, session_id)
) WITH CLUSTERING ORDER BY (start_time DESC);

-- Active sessions for real-time tracking
CREATE TABLE IF NOT EXISTS active_sessions (
    website_id UUID,
    session_id UUID PRIMARY KEY,
    visitor_id UUID,
    start_time TIMESTAMP,
    last_activity TIMESTAMP,
    current_page TEXT,
    page_views COUNTER,
    events_count COUNTER,
    ttl INT -- time to live in seconds
);

-- ====================================
-- ANALYTICS & REPORTING TABLES
-- ====================================

-- Daily aggregated metrics by website
CREATE TABLE IF NOT EXISTS daily_website_metrics (
    website_id UUID,
    metric_date TEXT, -- YYYY-MM-DD
    unique_visitors COUNTER,
    total_sessions COUNTER,
    total_pageviews COUNTER,
    total_events COUNTER,
    bounce_rate DECIMAL,
    avg_session_duration DECIMAL,
    conversion_rate DECIMAL,
    top_pages MAP<TEXT, BIGINT>,
    top_events MAP<TEXT, BIGINT>,
    device_breakdown MAP<TEXT, BIGINT>, -- desktop:1000, mobile:500
    country_breakdown MAP<TEXT, BIGINT>,
    PRIMARY KEY (website_id, metric_date)
) WITH CLUSTERING ORDER BY (metric_date DESC);

-- Hourly metrics for real-time dashboard
CREATE TABLE IF NOT EXISTS hourly_website_metrics (
    website_id UUID,
    metric_hour TEXT, -- YYYY-MM-DD-HH
    unique_visitors COUNTER,
    sessions COUNTER,
    pageviews COUNTER,
    events COUNTER,
    PRIMARY KEY (website_id, metric_hour)
) WITH CLUSTERING ORDER BY (metric_hour DESC);

-- Page performance metrics
CREATE TABLE IF NOT EXISTS page_metrics (
    website_id UUID,
    page_url TEXT,
    metric_date TEXT,
    views COUNTER,
    unique_visitors COUNTER,
    avg_time_on_page DECIMAL,
    bounce_rate DECIMAL,
    exit_rate DECIMAL,
    scroll_depth_avg DECIMAL,
    click_events COUNTER,
    PRIMARY KEY ((website_id, page_url), metric_date)
) WITH CLUSTERING ORDER BY (metric_date DESC);

-- Event performance metrics
CREATE TABLE IF NOT EXISTS event_metrics (
    website_id UUID,
    event_type TEXT,
    event_name TEXT,
    metric_date TEXT,
    total_count COUNTER,
    unique_users COUNTER,
    conversion_rate DECIMAL,
    avg_value DECIMAL, -- for events with values
    PRIMARY KEY ((website_id, event_type), event_name, metric_date)
) WITH CLUSTERING ORDER BY (event_name ASC, metric_date DESC);

-- ====================================
-- FUNNEL & CONVERSION TRACKING
-- ====================================

-- Conversion funnels definition
CREATE TABLE IF NOT EXISTS funnels (
    website_id UUID,
    funnel_id UUID,
    name TEXT,
    steps LIST<TEXT>, -- ordered list of events/pages
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    status TEXT, -- active, inactive
    PRIMARY KEY (website_id, funnel_id)
);

-- Funnel performance by date
CREATE TABLE IF NOT EXISTS funnel_metrics (
    website_id UUID,
    funnel_id UUID,
    metric_date TEXT,
    step_index INT,
    step_name TEXT,
    users_entered COUNTER,
    users_completed COUNTER,
    conversion_rate DECIMAL,
    drop_off_rate DECIMAL,
    PRIMARY KEY ((website_id, funnel_id), metric_date, step_index)
);

-- User funnel progress tracking
CREATE TABLE IF NOT EXISTS user_funnel_progress (
    website_id UUID,
    funnel_id UUID,
    visitor_id UUID,
    current_step INT,
    completed_steps SET<INT>,
    started_at TIMESTAMP,
    last_progress TIMESTAMP,
    completed BOOLEAN,
    PRIMARY KEY ((website_id, funnel_id), visitor_id)
);

-- ====================================
-- SEGMENTATION & PERSONALIZATION
-- ====================================

-- User segments definition
CREATE TABLE IF NOT EXISTS segments (
    website_id UUID,
    segment_id UUID,
    name TEXT,
    description TEXT,
    criteria MAP<TEXT, TEXT>, -- JSON-like criteria
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_count COUNTER,
    PRIMARY KEY (website_id, segment_id)
);

-- User segment membership
CREATE TABLE IF NOT EXISTS user_segments (
    website_id UUID,
    segment_id UUID,
    visitor_id UUID,
    added_at TIMESTAMP,
    properties MAP<TEXT, TEXT>,
    PRIMARY KEY ((website_id, segment_id), visitor_id)
);

-- Content performance by segment
CREATE TABLE IF NOT EXISTS content_segment_metrics (
    website_id UUID,
    content_id TEXT, -- page_url or content identifier
    segment_id UUID,
    metric_date TEXT,
    views COUNTER,
    engagement_score DECIMAL,
    conversion_rate DECIMAL,
    PRIMARY KEY ((website_id, content_id), segment_id, metric_date)
);

-- ====================================
-- REAL-TIME FEATURES
-- ====================================

-- Real-time visitor activity (short TTL)
CREATE TABLE IF NOT EXISTS realtime_activity (
    website_id UUID,
    visitor_id UUID,
    last_seen TIMESTAMP,
    current_page TEXT,
    session_id UUID,
    country TEXT,
    device_type TEXT,
    PRIMARY KEY (website_id, visitor_id)
) WITH default_time_to_live = 3600; -- 1 hour TTL

-- Real-time alerts/triggers
CREATE TABLE IF NOT EXISTS triggered_events (
    website_id UUID,
    trigger_id UUID,
    visitor_id UUID,
    triggered_at TIMESTAMP,
    event_data MAP<TEXT, TEXT>,
    status TEXT, -- pending, processed, failed
    PRIMARY KEY ((website_id, trigger_id), triggered_at, visitor_id)
);

-- ====================================
-- INDEXES FOR OPTIMIZATION
-- ====================================

-- Additional secondary indexes for common queries
CREATE INDEX IF NOT EXISTS events_visitor_idx ON events (visitor_id);
CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id);
CREATE INDEX IF NOT EXISTS events_page_url_idx ON events (page_url);

CREATE INDEX IF NOT EXISTS sessions_visitor_idx ON sessions (visitor_id);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Show final schema
DESCRIBE KEYSPACE user_behavior_analytics;