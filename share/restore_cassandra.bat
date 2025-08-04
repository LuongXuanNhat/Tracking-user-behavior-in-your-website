@echo off
REM Cassandra Database Restore Script
REM Usage: restore_cassandra.bat [backup_name]

setlocal enabledelayedexpansion

REM Configuration
set CONTAINER_NAME=cassandra_user_logs
set KEYSPACE=user_behavior_analytics
set BACKUP_DIR=%~dp0backups

if "%1"=="" (
    echo Usage: restore_cassandra.bat [backup_name]
    echo.
    echo Available backups:
    dir "%BACKUP_DIR%" /b
    pause
    exit /b 1
)

set BACKUP_NAME=%1
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%

echo =====================================
echo Cassandra Database Restore Script
echo =====================================
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Backup: %BACKUP_NAME%
echo =====================================

REM Kiểm tra backup có tồn tại không
if not exist "%BACKUP_PATH%" (
    if not exist "%BACKUP_PATH%.tar.gz" (
        echo ERROR: Backup %BACKUP_NAME% not found!
        echo Available backups:
        dir "%BACKUP_DIR%" /b
        pause
        exit /b 1
    )
)

REM Giải nén backup nếu cần
if exist "%BACKUP_PATH%.tar.gz" (
    echo Extracting backup archive...
    where 7z >nul 2>nul
    if errorlevel 1 (
        echo ERROR: 7zip not found! Please install 7zip to extract the backup.
        pause
        exit /b 1
    )
    7z x "%BACKUP_PATH%.tar.gz" -o"%BACKUP_DIR%"
    7z x "%BACKUP_DIR%\%BACKUP_NAME%.tar" -o"%BACKUP_DIR%"
    del "%BACKUP_DIR%\%BACKUP_NAME%.tar"
)

REM Kiểm tra container có đang chạy không
echo Checking if Cassandra container is running...
docker ps | findstr %CONTAINER_NAME% >nul
if errorlevel 1 (
    echo ERROR: Container %CONTAINER_NAME% is not running!
    echo Please start the container using: docker-compose up -d cassandra
    pause
    exit /b 1
)

echo WARNING: This will overwrite existing data in the keyspace!
set /p CONFIRM=Are you sure you want to continue? (y/N): 
if /i not "%CONFIRM%"=="y" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo Stopping Cassandra service...
docker exec %CONTAINER_NAME% nodetool drain

echo Copying backup data to container...
docker cp "%BACKUP_PATH%" %CONTAINER_NAME%:/tmp/restore_data

echo Restoring data...
docker exec %CONTAINER_NAME% bash -c "cp -r /tmp/restore_data/* /var/lib/cassandra/data/ && chown -R cassandra:cassandra /var/lib/cassandra/data"

echo Refreshing keyspace...
docker exec %CONTAINER_NAME% nodetool refresh %KEYSPACE%

echo Cleanup temporary files...
docker exec %CONTAINER_NAME% rm -rf /tmp/restore_data

echo =====================================
echo Restore completed successfully!
echo =====================================

pause
