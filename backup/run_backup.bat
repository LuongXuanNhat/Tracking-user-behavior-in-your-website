@echo off
chcp 65001 > nul

REM ===================================
REM Cassandra Database Restore Script - Improved
REM ===================================

setlocal EnableDelayedExpansion

REM Configuration - có thể override bằng tham số
set "CONTAINER_NAME=%1"
set "KEYSPACE=%2"
set "BACKUP_PATH=%3"

REM Default values nếu không có tham số
if "%CONTAINER_NAME%"=="" set "CONTAINER_NAME=cassandra_node1"
if "%KEYSPACE%"=="" set "KEYSPACE=user_behavior_analytics"
if "%BACKUP_PATH%"=="" set "BACKUP_PATH=%~dp0"

REM Script info
set "SCRIPT_DIR=%~dp0"
set "TABLES=customers websites events events_by_user events_by_type events_by_session api_key_websites"

echo =====================================
echo Cassandra Database Restore Script
echo =====================================
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Backup Path: %BACKUP_PATH%
echo =====================================

REM Kiểm tra container có đang chạy không
echo Checking if Cassandra container is running...
docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" > nul
if errorlevel 1 (
    echo ERROR: Container %CONTAINER_NAME% is not running!
    echo Please start the container first: docker-compose up -d cassandra
    pause
    exit /b 1
)

REM Đợi Cassandra ready
echo Waiting for Cassandra to be ready...
timeout /t 5 > nul

:wait_cassandra
docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT now() FROM system.local;" > nul 2>&1
if errorlevel 1 (
    echo Waiting for Cassandra to be fully ready...
    timeout /t 5 > nul
    goto :wait_cassandra
)
echo Cassandra is ready!

REM =====================================
REM RESTORE SCHEMA
REM =====================================

echo.
echo =====================================
echo Restoring Database Schema...
echo =====================================

REM Kiểm tra và copy schema files
if not exist "%BACKUP_PATH%\schema\keyspace_schema.cql" (
    if exist "%BACKUP_PATH%\schema\database_schema.cql" (
        set "SCHEMA_FILE=database_schema.cql"
    ) else (
        echo ERROR: No schema file found!
        echo Expected: keyspace_schema.cql or database_schema.cql
        pause
        exit /b 1
    )
) else (
    set "SCHEMA_FILE=keyspace_schema.cql"
)

REM Copy schema file to container
echo Copying schema file to container...
docker cp "%BACKUP_PATH%\schema\%SCHEMA_FILE%" "%CONTAINER_NAME%:/tmp/restore_schema.cql"
if errorlevel 1 (
    echo ERROR: Failed to copy schema file to container!
    pause
    exit /b 1
)

REM Drop keyspace nếu tồn tại (với confirmation)
echo.
set /p "CONFIRM=Do you want to DROP existing keyspace %KEYSPACE% if it exists? (y/N): "
if /i "%CONFIRM%"=="y" (
    echo Dropping existing keyspace %KEYSPACE%...
    docker exec "%CONTAINER_NAME%" cqlsh -e "DROP KEYSPACE IF EXISTS %KEYSPACE%;"
    if errorlevel 1 (
        echo Warning: Could not drop keyspace (may not exist)
    )
    timeout /t 2 > nul
)

REM Create keyspace và tables
echo Creating keyspace and tables...
docker exec "%CONTAINER_NAME%" cqlsh -f "/tmp/restore_schema.cql"
if errorlevel 1 (
    echo ERROR: Failed to create keyspace and tables!
    echo Trying alternative method...
    
    REM Alternative: thử từng table schema riêng biệt
    for %%t in (%TABLES%) do (
        if exist "%BACKUP_PATH%\schema\table_%%t_schema.cql" (
            echo   Creating table: %%t
            docker cp "%BACKUP_PATH%\schema\table_%%t_schema.cql" "%CONTAINER_NAME%:/tmp/table_%%t.cql"
            docker exec "%CONTAINER_NAME%" cqlsh -f "/tmp/table_%%t.cql" 2>nul
        )
    )
)

REM Verify keyspace creation
echo Verifying keyspace creation...
docker exec "%CONTAINER_NAME%" cqlsh -e "DESCRIBE KEYSPACE %KEYSPACE%;" > nul 2>&1
if errorlevel 1 (
    echo ERROR: Keyspace %KEYSPACE% was not created properly!
    echo Please check the schema file and try again.
    pause
    exit /b 1
)
echo ✓ Keyspace and tables created successfully

REM =====================================
REM RESTORE DATA
REM =====================================

echo.
echo =====================================
echo Restoring Data...
echo =====================================

set "SUCCESS_COUNT=0"
set "FAIL_COUNT=0"

for %%t in (%TABLES%) do (
    echo.
    echo Processing table: %%t
    
    REM Kiểm tra file data có tồn tại không
    if exist "%BACKUP_PATH%\data\%%t_data.csv" (
        echo   Data file found for table %%t
        
        REM Verify table exists
        docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT COUNT(*) FROM %KEYSPACE%.%%t LIMIT 1;" > nul 2>&1
        if errorlevel 1 (
            echo   ✗ Table %%t does not exist! Skipping...
            set /a "FAIL_COUNT+=1"
            goto :next_table
        )
        
        REM Copy data file to container
        docker cp "%BACKUP_PATH%\data\%%t_data.csv" "%CONTAINER_NAME%:/tmp/%%t_data.csv"
        if errorlevel 1 (
            echo   ✗ Failed to copy data file for table %%t
            set /a "FAIL_COUNT+=1"
            goto :next_table
        )
        
        REM Truncate table first (optional, with confirmation)
        echo   Truncating existing data in table %%t...
        docker exec "%CONTAINER_NAME%" cqlsh -e "TRUNCATE %KEYSPACE%.%%t;" 2>nul
        
        REM Import data
        echo   Importing data into table %%t...
        docker exec "%CONTAINER_NAME%" cqlsh -e "COPY %KEYSPACE%.%%t FROM '/tmp/%%t_data.csv' WITH HEADER=true;"
        if errorlevel 1 (
            echo   ✗ Failed to import data for table %%t
            set /a "FAIL_COUNT+=1"
            
            REM Try alternative method without header
            echo   Trying without header...
            docker exec "%CONTAINER_NAME%" cqlsh -e "COPY %KEYSPACE%.%%t FROM '/tmp/%%t_data.csv';" 2>nul
            if not errorlevel 1 (
                echo   ✓ Data imported successfully (without header)
                set /a "SUCCESS_COUNT+=1"
            )
        ) else (
            echo   ✓ Data imported successfully for table %%t
            set /a "SUCCESS_COUNT+=1"
        )
        
        REM Cleanup temp file
        docker exec "%CONTAINER_NAME%" rm -f "/tmp/%%t_data.csv" 2>nul
        
        REM Verify data import
        for /f %%c in ('docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT COUNT(*) FROM %KEYSPACE%.%%t;" ^| findstr /r "[0-9]"') do (
            if not "%%c"=="0" (
                echo   ✓ Verified: %%c rows imported
            ) else (
                echo   ! Warning: Table appears to be empty after import
            )
        )
        
    ) else (
        echo   ✗ Data file not found for table %%t (data\%%t_data.csv)
        set /a "FAIL_COUNT+=1"
    )
    
    :next_table
)

REM =====================================
REM CLEANUP AND SUMMARY
REM =====================================

echo.
echo Cleaning up temporary files...
docker exec "%CONTAINER_NAME%" rm -f "/tmp/restore_schema.cql" 2>nul

echo.
echo =====================================
echo Restore Summary
echo =====================================
echo Tables processed: %TABLES%
echo Successful imports: %SUCCESS_COUNT%
echo Failed imports: %FAIL_COUNT%
echo =====================================

if %FAIL_COUNT% equ 0 (
    echo ✓ All data restored successfully!
) else (
    echo ! Some tables failed to restore. Check the logs above.
    echo   You may need to manually import failed tables.
)

REM Hiển thị thống kê cuối cùng
echo.
echo Final database statistics:
for %%t in (%TABLES%) do (
    for /f %%c in ('docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT COUNT(*) FROM %KEYSPACE%.%%t;" 2^>nul ^| findstr /r "[0-9]"') do (
        echo   Table %%t: %%c rows
    )
)

echo.
echo =====================================
echo Restore process completed!
echo =====================================

if %FAIL_COUNT% gtr 0 (
    echo Note: %FAIL_COUNT% tables failed to restore.
    echo Check data files and table schemas, then try again.
    pause
    exit /b 1
) else (
    echo All tables restored successfully!
    pause
    exit /b 0
)