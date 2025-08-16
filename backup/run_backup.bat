@echo off
chcp 65001 > nul

REM ===================================
REM Cassandra Database Backup Script
REM ===================================

setlocal EnableDelayedExpansion

REM Configuration
set "CONTAINER_NAME=cassandra_user_logs"
set "KEYSPACE=user_behavior_analytics"
set "SCRIPT_DIR=%~dp0"
set "DATE_TIME=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "DATE_TIME=%DATE_TIME: =0%"
set "SNAPSHOT_NAME=backup_%DATE_TIME%"
set "BACKUP_DIR=%SCRIPT_DIR%backups\%SNAPSHOT_NAME%"

echo =====================================
echo Cassandra Database Backup Script
echo =====================================
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Backup Directory: %BACKUP_DIR%
echo Snapshot Name: %SNAPSHOT_NAME%
echo =====================================

REM Tạo thư mục backup nếu chưa có
if not exist "%SCRIPT_DIR%backups" (
    echo Creating backups directory...
    mkdir "%SCRIPT_DIR%backups"
)

if not exist "%BACKUP_DIR%" (
    echo Creating backup directory: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
)

REM Kiểm tra container có đang chạy không
echo Checking if Cassandra container is running...
docker ps | findstr "%CONTAINER_NAME%" > nul
if errorlevel 1 (
    echo ERROR: Container %CONTAINER_NAME% is not running!
    echo Please start the container using: docker-compose up -d cassandra
    pause
    exit /b 1
)

REM Tạo snapshot
echo Creating snapshot: %SNAPSHOT_NAME%
docker exec %CONTAINER_NAME% nodetool snapshot -t %SNAPSHOT_NAME% %KEYSPACE%
if errorlevel 1 (
    echo ERROR: Failed to create snapshot!
    pause
    exit /b 1
)

REM Copy snapshot data ra ngoài
echo Copying snapshot data...
docker cp "%CONTAINER_NAME%:/var/lib/cassandra/data/%KEYSPACE%" "%BACKUP_DIR%\"
if errorlevel 1 (
    echo ERROR: Failed to copy snapshot data!
    REM Cleanup on failure
    docker exec %CONTAINER_NAME% nodetool clearsnapshot -t %SNAPSHOT_NAME%
    pause
    exit /b 1
)

REM Tạo file metadata
echo Creating backup metadata...
echo Backup Information > "%BACKUP_DIR%\backup_info.txt"
echo ================== >> "%BACKUP_DIR%\backup_info.txt"
echo Date: %date% %time% >> "%BACKUP_DIR%\backup_info.txt"
echo Container: %CONTAINER_NAME% >> "%BACKUP_DIR%\backup_info.txt"
echo Keyspace: %KEYSPACE% >> "%BACKUP_DIR%\backup_info.txt"
echo Snapshot Name: %SNAPSHOT_NAME% >> "%BACKUP_DIR%\backup_info.txt"
echo Script Location: %SCRIPT_DIR% >> "%BACKUP_DIR%\backup_info.txt"

REM Copy database schema
echo Copying database schema...
docker exec %CONTAINER_NAME% cqlsh -e "DESCRIBE KEYSPACE %KEYSPACE%;" > "%BACKUP_DIR%\schema.cql" 2>nul

REM Tạo file tar.gz (nếu có 7zip hoặc tar)
echo Creating compressed archive...
cd /d "%SCRIPT_DIR%backups"
where tar >nul 2>nul
if not errorlevel 1 (
    tar -czf "%SNAPSHOT_NAME%.tar.gz" "%SNAPSHOT_NAME%"
    if not errorlevel 1 (
        echo Removing uncompressed backup...
        rmdir /s /q "%SNAPSHOT_NAME%"
        set BACKUP_FILE=%SNAPSHOT_NAME%.tar.gz
    ) else (
        set BACKUP_FILE=%SNAPSHOT_NAME%
    )
) else (
    where 7z >nul 2>nul
    if not errorlevel 1 (
        7z a -tgzip "%SNAPSHOT_NAME%.tar.gz" "%SNAPSHOT_NAME%"
        if not errorlevel 1 (
            echo Removing uncompressed backup...
            rmdir /s /q "%SNAPSHOT_NAME%"
            set BACKUP_FILE=%SNAPSHOT_NAME%.tar.gz
        ) else (
            set BACKUP_FILE=%SNAPSHOT_NAME%
        )
    ) else (
        echo Warning: tar or 7zip not found. Backup will remain uncompressed.
        set BACKUP_FILE=%SNAPSHOT_NAME%
    )
)

REM Xóa snapshot trong container để tiết kiệm dung lượng
echo Cleaning up snapshot in container...
docker exec %CONTAINER_NAME% nodetool clearsnapshot -t %SNAPSHOT_NAME%

echo =====================================
echo Backup completed successfully!
echo Backup location: %SCRIPT_DIR%backups\%BACKUP_FILE%
echo =====================================

REM Hiển thị danh sách backup
echo Current backups:
dir /B "%SCRIPT_DIR%backups"

echo.
echo Press any key to exit...
pause > nul
