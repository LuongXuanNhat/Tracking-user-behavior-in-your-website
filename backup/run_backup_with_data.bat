@echo off
chcp 65001 > nul

REM ===================================
REM Cassandra Database Backup Script with Data Export
REM ===================================

setlocal EnableDelayedExpansion

REM Configuration
set "CONTAINER_NAME=cassandra_node1"
set "KEYSPACE=user_behavior_analytics"
set "SCRIPT_DIR=%~dp0"

REM Tạo timestamp cho backup
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
set "SNAPSHOT_NAME=data_backup_%TIMESTAMP%"

REM Định nghĩa đường dẫn backup với quotes
set "BACKUPS_ROOT=%SCRIPT_DIR%backups"
set "BACKUP_DIR=%BACKUPS_ROOT%\%SNAPSHOT_NAME%"
set "DATA_DIR=%BACKUP_DIR%\data"
set "SCHEMA_DIR=%BACKUP_DIR%\schema"

echo =====================================
echo Cassandra Database Backup Script with Data
echo =====================================
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Backup Directory: %BACKUP_DIR%
echo Snapshot Name: %SNAPSHOT_NAME%
echo =====================================

REM Tạo thư mục backup nếu chưa có
if not exist "%BACKUPS_ROOT%" (
    echo Creating backups directory...
    mkdir "%BACKUPS_ROOT%"
    if errorlevel 1 (
        echo ERROR: Cannot create backups directory!
        pause
        exit /b 1
    )
)

if not exist "%BACKUP_DIR%" (
    echo Creating backup directory: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
    if errorlevel 1 (
        echo ERROR: Cannot create backup directory!
        pause
        exit /b 1
    )
)

REM Tạo thư mục con cho data và schema
mkdir "%DATA_DIR%"
mkdir "%SCHEMA_DIR%"

REM Kiểm tra container có đang chạy không
echo Checking if Cassandra container is running...
docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" > nul
if errorlevel 1 (
    echo ERROR: Container %CONTAINER_NAME% is not running!
    echo Please start the container using: docker-compose up -d cassandra
    pause
    exit /b 1
)

REM Tạo snapshot cho structure backup
echo Creating snapshot: %SNAPSHOT_NAME%
docker exec "%CONTAINER_NAME%" nodetool snapshot -t "%SNAPSHOT_NAME%" "%KEYSPACE%"
if errorlevel 1 (
    echo ERROR: Failed to create snapshot!
    pause
    exit /b 1
)

REM Export database schema
echo Exporting database schema...
docker exec "%CONTAINER_NAME%" cqlsh -e "DESCRIBE KEYSPACE %KEYSPACE%;" > "%SCHEMA_DIR%\keyspace_schema.cql" 2>nul
if errorlevel 1 (
    echo Warning: Could not export keyspace schema using cqlsh
    REM Fallback: copy schema file from project
    if exist "%SCRIPT_DIR%..\cassandra\database.cql" (
        copy "%SCRIPT_DIR%..\cassandra\database.cql" "%SCHEMA_DIR%\database_schema.cql" >nul
        echo Copied database schema from project files
    )
)

REM Export individual table schemas
echo Exporting individual table schemas...
set "TABLES=customers websites events events_by_user events_by_type events_by_session api_key_websites"

for %%t in (%TABLES%) do (
    echo   Exporting schema for table: %%t
    docker exec "%CONTAINER_NAME%" cqlsh -e "DESCRIBE TABLE %KEYSPACE%.%%t;" > "%SCHEMA_DIR%\table_%%t_schema.cql" 2>nul
    if errorlevel 1 (
        echo     Warning: Could not export schema for table %%t
    )
)

REM =====================================
REM EXPORT DATA FROM ALL TABLES
REM =====================================

echo =====================================
echo Exporting data from all tables...
echo =====================================

REM Function to export table data with error handling
REM Loop through each table and export data

for %%t in (%TABLES%) do (
    echo.
    echo Exporting data from table: %%t
    echo   Please wait, this may take a while for large tables...
    
    REM Export data as CSV
    docker exec "%CONTAINER_NAME%" cqlsh -e "COPY %KEYSPACE%.%%t TO '/tmp/%%t_data.csv' WITH HEADER=true;" 2>nul
    if not errorlevel 1 (
        REM Copy CSV file from container to host
        docker cp "%CONTAINER_NAME%:/tmp/%%t_data.csv" "%DATA_DIR%\%%t_data.csv" 2>nul
        if not errorlevel 1 (
            echo   ✓ Data exported successfully for table %%t
            REM Cleanup temp file in container
            docker exec "%CONTAINER_NAME%" rm -f "/tmp/%%t_data.csv" 2>nul
        ) else (
            echo   ✗ Failed to copy data file for table %%t
        )
    ) else (
        echo   ✗ Failed to export data for table %%t - table may be empty or inaccessible
    )
    
    REM Alternative method: export as INSERT statements
    echo   Creating INSERT statements for table: %%t
    docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT * FROM %KEYSPACE%.%%t;" > "%DATA_DIR%\%%t_select_results.txt" 2>nul
    if not errorlevel 1 (
        echo   ✓ SELECT results exported for table %%t
    ) else (
        echo   ✗ Failed to export SELECT results for table %%t
    )
)

REM =====================================
REM EXPORT ADDITIONAL METADATA
REM =====================================

echo.
echo Exporting additional metadata...

REM Export keyspace info
docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT * FROM system_schema.keyspaces WHERE keyspace_name='%KEYSPACE%';" > "%SCHEMA_DIR%\keyspace_info.txt" 2>nul

REM Export table info
docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT * FROM system_schema.tables WHERE keyspace_name='%KEYSPACE%';" > "%SCHEMA_DIR%\tables_info.txt" 2>nul

REM Export columns info
docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT * FROM system_schema.columns WHERE keyspace_name='%KEYSPACE%';" > "%SCHEMA_DIR%\columns_info.txt" 2>nul

REM Export indexes info
docker exec "%CONTAINER_NAME%" cqlsh -e "SELECT * FROM system_schema.indexes WHERE keyspace_name='%KEYSPACE%';" > "%SCHEMA_DIR%\indexes_info.txt" 2>nul

REM Copy snapshot data (structure backup)
echo.
echo Copying snapshot data (structure backup)...
set "TEMP_DIR=%BACKUP_DIR%\temp_snapshot"
mkdir "%TEMP_DIR%"

docker exec "%CONTAINER_NAME%" find /var/lib/cassandra/data/%KEYSPACE% -name "*%SNAPSHOT_NAME%*" -type d > "%TEMP%\snapshot_paths.txt"

REM Đọc từng path và copy
for /f "usebackq delims=" %%i in ("%TEMP%\snapshot_paths.txt") do (
    echo Copying snapshot from: %%i
    docker cp "%CONTAINER_NAME%:%%i" "%TEMP_DIR%\" 2>nul
    if errorlevel 1 (
        echo WARNING: Failed to copy some snapshot data from %%i
    )
)

REM Cleanup temp files
if exist "%TEMP_DIR%" (
    if exist "%TEMP_DIR%\*" (
        echo ✓ Snapshot data copied successfully
    ) else (
        echo Warning: No snapshot data found
        rmdir "%TEMP_DIR%"
    )
)
if exist "%TEMP%\snapshot_paths.txt" del "%TEMP%\snapshot_paths.txt"

REM =====================================
REM CREATE RESTORE SCRIPTS
REM =====================================

echo.
echo Creating restore scripts...

REM Create data restore script
(
echo @echo off
echo REM Auto-generated restore script
echo REM Usage: run_restore_data.bat [container_name] [keyspace_name]
echo.
echo set "CONTAINER_NAME=%%1"
echo set "KEYSPACE=%%2"
echo if "%%CONTAINER_NAME%%"=="" set "CONTAINER_NAME=%CONTAINER_NAME%"
echo if "%%KEYSPACE%%"=="" set "KEYSPACE=%KEYSPACE%"
echo.
echo echo Restoring data to container: %%CONTAINER_NAME%%, keyspace: %%KEYSPACE%%
echo.
echo REM First create keyspace and tables
echo docker exec %%CONTAINER_NAME%% cqlsh -f /tmp/keyspace_schema.cql
echo.
echo REM Copy schema files to container
echo docker cp schema\keyspace_schema.cql %%CONTAINER_NAME%%:/tmp/
echo.
echo REM Restore data for each table
for %%t in (%TABLES%) do (
echo echo Restoring data for table: %%t
echo if exist "data\%%t_data.csv" ^(
echo     docker cp "data\%%t_data.csv" %%CONTAINER_NAME%%:/tmp/
echo     docker exec %%CONTAINER_NAME%% cqlsh -e "COPY %%KEYSPACE%%.%%t FROM '/tmp/%%t_data.csv' WITH HEADER=true;"
echo     docker exec %%CONTAINER_NAME%% rm -f "/tmp/%%t_data.csv"
echo ^) else ^(
echo     echo Warning: Data file for table %%t not found
echo ^)
)
echo.
echo echo Data restore completed!
echo pause
) > "%BACKUP_DIR%\run_restore_data.bat"

REM Create Linux restore script
(
echo #!/bin/bash
echo # Auto-generated restore script for Linux
echo # Usage: ./run_restore_data.sh [container_name] [keyspace_name]
echo.
echo CONTAINER_NAME=${1:-%CONTAINER_NAME%}
echo KEYSPACE=${2:-%KEYSPACE%}
echo.
echo echo "Restoring data to container: $CONTAINER_NAME, keyspace: $KEYSPACE"
echo.
echo # Copy schema files to container
echo docker cp schema/keyspace_schema.cql $CONTAINER_NAME:/tmp/
echo.
echo # First create keyspace and tables
echo docker exec $CONTAINER_NAME cqlsh -f /tmp/keyspace_schema.cql
echo.
echo # Restore data for each table
for %%t in (%TABLES%) do (
echo if [ -f "data/%%t_data.csv" ]; then
echo     echo "Restoring data for table: %%t"
echo     docker cp "data/%%t_data.csv" $CONTAINER_NAME:/tmp/
echo     docker exec $CONTAINER_NAME cqlsh -e "COPY $KEYSPACE.%%t FROM '/tmp/%%t_data.csv' WITH HEADER=true;"
echo     docker exec $CONTAINER_NAME rm -f "/tmp/%%t_data.csv"
echo else
echo     echo "Warning: Data file for table %%t not found"
echo fi
)
echo.
echo echo "Data restore completed!"
) > "%BACKUP_DIR%\run_restore_data.sh"

REM Tạo file metadata tổng hợp
echo.
echo Creating comprehensive backup metadata...
(
echo Cassandra Database Backup with Data
echo ====================================
echo Date: %date% %time%
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Snapshot Name: %SNAPSHOT_NAME%
echo Script Location: %SCRIPT_DIR%
echo.
echo Backup Contents:
echo ================
echo - Schema backup: schema\ directory
echo - Data backup: data\ directory  
echo - Snapshot backup: temp_snapshot\ directory ^(if available^)
echo - Restore scripts: run_restore_data.bat ^& run_restore_data.sh
echo.
echo Tables backed up:
for %%t in (%TABLES%) do (
echo - %%t
)
echo.
echo File Structure:
echo ===============
dir /B /S
echo.
echo Docker Info:
docker version --format "Client: {{.Client.Version}} - Server: {{.Server.Version}}"
echo.
echo Cassandra Info:
docker exec "%CONTAINER_NAME%" nodetool version 2>nul
echo.
echo System Info:
ver
) > "%BACKUP_DIR%\backup_info.txt"

REM Xóa snapshot trong container để tiết kiệm dung lượng
echo.
echo Cleaning up snapshot in container...
docker exec "%CONTAINER_NAME%" nodetool clearsnapshot -t "%SNAPSHOT_NAME%" 2>nul

REM Tạo file nén
echo.
echo Creating compressed archive...
cd /d "%BACKUPS_ROOT%"

REM Thử sử dụng tar (Windows 10+)
where tar >nul 2>nul
if not errorlevel 1 (
    echo Using Windows tar to compress...
    tar -czf "%SNAPSHOT_NAME%.tar.gz" "%SNAPSHOT_NAME%"
    if not errorlevel 1 (
        echo Removing uncompressed backup...
        rmdir /s /q "%SNAPSHOT_NAME%"
        set "BACKUP_FILE=%SNAPSHOT_NAME%.tar.gz"
        goto :compressed
    )
)

REM Thử sử dụng PowerShell Compress-Archive
echo Using PowerShell to compress...
powershell -command "Compress-Archive -Path '%SNAPSHOT_NAME%' -DestinationPath '%SNAPSHOT_NAME%.zip'" 2>nul
if not errorlevel 1 (
    echo Removing uncompressed backup...
    rmdir /s /q "%SNAPSHOT_NAME%"
    set "BACKUP_FILE=%SNAPSHOT_NAME%.zip"
    goto :compressed
)

echo Warning: No compression tool found. Backup will remain uncompressed.
set "BACKUP_FILE=%SNAPSHOT_NAME%"

:compressed

echo =====================================
echo Data backup completed successfully!
echo =====================================
echo Backup location: %BACKUPS_ROOT%\%BACKUP_FILE%
echo.
echo Backup includes:
echo ✓ Database schema ^(structure^)
echo ✓ All table data ^(CSV format^)
echo ✓ Snapshot backup ^(if available^)
echo ✓ Restore scripts ^(Windows ^& Linux^)
echo ✓ Comprehensive metadata
echo =====================================

REM Hiển thị thông tin backup
echo.
echo Backup size:
if exist "%BACKUPS_ROOT%\%BACKUP_FILE%" (
    for %%F in ("%BACKUPS_ROOT%\%BACKUP_FILE%") do echo   %%~zF bytes
)

echo.
echo Current backups:
dir /B "%BACKUPS_ROOT%" 2>nul

echo.
echo =====================================
echo Backup process completed successfully!
echo.
echo To restore this backup:
echo 1. Extract the backup file
echo 2. Run run_restore_data.bat ^(Windows^) or run_restore_data.sh ^(Linux^)
echo 3. Provide container name and keyspace name if different
echo =====================================
echo.
echo Press any key to exit...
pause > nul
