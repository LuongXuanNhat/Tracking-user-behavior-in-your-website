@echo off
REM Cassandra Database Backup Script
REM Usage: backup_cassandra.bat

setlocal enabledelayedexpansion

REM Configuration
set CONTAINER_NAME=cassandra_user_logs
set KEYSPACE=user_behavior_analytics
set BACKUP_DIR=%~dp0backups
set DATE_TIME=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE_TIME=%DATE_TIME: =0%
set SNAPSHOT_NAME=backup_%DATE_TIME%

echo =====================================
echo Cassandra Database Backup Script
echo =====================================
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Backup Directory: %BACKUP_DIR%
echo Snapshot Name: %SNAPSHOT_NAME%
echo =====================================

REM Tạo thư mục backup nếu chưa có
if not exist "%BACKUP_DIR%" (
    echo Creating backup directory: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
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
docker cp %CONTAINER_NAME%:/var/lib/cassandra/data/%KEYSPACE% "%BACKUP_DIR%\%SNAPSHOT_NAME%"
if errorlevel 1 (
    echo ERROR: Failed to copy snapshot data!
    goto cleanup
)

REM Tạo file metadata
echo Creating backup metadata...
echo Backup Information > "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"
echo ================== >> "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"
echo Date: %date% %time% >> "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"
echo Container: %CONTAINER_NAME% >> "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"
echo Keyspace: %KEYSPACE% >> "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"
echo Snapshot Name: %SNAPSHOT_NAME% >> "%BACKUP_DIR%\%SNAPSHOT_NAME%\backup_info.txt"

REM Tạo file tar.gz (nếu có 7zip)
where 7z >nul 2>nul
if not errorlevel 1 (
    echo Creating compressed archive...
    7z a -tgzip "%BACKUP_DIR%\%SNAPSHOT_NAME%.tar.gz" "%BACKUP_DIR%\%SNAPSHOT_NAME%\*"
    if not errorlevel 1 (
        echo Removing uncompressed backup...
        rmdir /s /q "%BACKUP_DIR%\%SNAPSHOT_NAME%"
    )
)

:cleanup
REM Xóa snapshot trong container để tiết kiệm dung lượng
echo Cleaning up snapshot in container...
docker exec %CONTAINER_NAME% nodetool clearsnapshot -t %SNAPSHOT_NAME%

echo =====================================
echo Backup completed successfully!
echo Backup location: %BACKUP_DIR%\%SNAPSHOT_NAME%
echo =====================================

REM Hiển thị danh sách backup
echo Current backups:
dir "%BACKUP_DIR%" /b

pause
