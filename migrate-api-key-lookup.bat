@echo off
REM Migration script để populate api_key_websites table
echo 🚀 Starting API key lookup table migration...

REM 1. Kiểm tra Cassandra connection
echo 📍 Step 1: Checking Cassandra connection...
docker exec -i cassandra_node1 cqlsh -e "SELECT cluster_name FROM system.local;"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Cassandra connection failed. Please start Cassandra first.
    exit /b 1
)

REM 2. Create optimized table
echo 📍 Step 2: Creating api_key_websites table...
docker exec -i cassandra_node1 cqlsh < cassandra\migration\04_api_key_fast_lookup.cql

REM 3. Migrate data
echo 📍 Step 3: Migrating data from websites table...
docker exec -i cassandra_node1 cqlsh -e "USE user_behavior_analytics; INSERT INTO api_key_websites (api_key, website_id, customer_id, name, domain, url, status, settings, created_at, updated_at, last_activity) SELECT api_key, website_id, customer_id, name, domain, url, status, settings, created_at, updated_at, last_activity FROM websites WHERE api_key IS NOT NULL AND api_key != ''; SELECT COUNT(*) as migrated_records FROM api_key_websites;"

REM 4. Test performance
echo 📍 Step 4: Testing query performance...
docker exec -i cassandra_node1 cqlsh -e "USE user_behavior_analytics; TIMING ON; SELECT COUNT(*) FROM api_key_websites; SELECT * FROM api_key_websites LIMIT 5;"

echo ✅ Migration completed successfully!
echo 🔍 Next steps:
echo   1. Restart your application to use the new optimized query
echo   2. Monitor performance improvements
echo   3. Remove old ALLOW FILTERING queries once confirmed working

pause
