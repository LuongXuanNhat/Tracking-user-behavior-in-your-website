-- Setup database for User Behavior Tracking
-- Run this script after Cassandra is up and running

-- Create keyspace
CREATE KEYSPACE IF NOT EXISTS user_logs
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

USE user_logs;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create index on email for faster queries
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY,
    name TEXT,
    url TEXT,
    api_key TEXT,
    type TEXT,
    description TEXT,
    owner TEXT,
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_used TIMESTAMP,
    usage_count BIGINT,
    permissions MAP<TEXT, TEXT>
);

-- Create index on api_key for authentication
CREATE INDEX IF NOT EXISTS websites_api_key_idx ON websites (api_key);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY,
    api_key TEXT,
    website_id UUID,
    website_name TEXT,
    website_url TEXT,
    type TEXT,
    description TEXT,
    owner TEXT,
    status TEXT,
    permissions MAP<TEXT, TEXT>,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_used TIMESTAMP,
    usage_count BIGINT,
    expires_at TIMESTAMP
);

-- Create index on api_key for authentication
CREATE INDEX IF NOT EXISTS api_keys_api_key_idx ON api_keys (api_key);

-- Create user_events table (partitioned by user_id and created_date for better performance)
CREATE TABLE IF NOT EXISTS user_events (
    user_id UUID,
    created_date TEXT,
    timestamp TIMESTAMP,
    id UUID,
    event_type TEXT,
    element_type TEXT,
    page_url TEXT,
    element_id TEXT,
    metadata MAP<TEXT, TEXT>,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    PRIMARY KEY ((user_id, created_date), timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Create events_by_date table for analytics queries (partitioned by date)
CREATE TABLE IF NOT EXISTS events_by_date (
    created_date TEXT,
    timestamp TIMESTAMP,
    id UUID,
    user_id UUID,
    event_type TEXT,
    element_type TEXT,
    page_url TEXT,
    element_id TEXT,
    metadata MAP<TEXT, TEXT>,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    PRIMARY KEY (created_date, timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Create additional indexes for better query performance
CREATE INDEX IF NOT EXISTS events_event_type_idx ON events_by_date (event_type);
CREATE INDEX IF NOT EXISTS events_element_type_idx ON events_by_date (element_type);
CREATE INDEX IF NOT EXISTS events_user_id_idx ON events_by_date (user_id);

DESCRIBE KEYSPACE user_logs;
