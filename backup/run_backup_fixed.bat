@echo off
chcp 65001 > nul

REM ===================================
REM Cassandra Database Backup Script (Fixed Version)
REM ===================================

setlocal EnableDelayedExpansion

REM Configuration
set "CONTAINER_NAME=cassandra_user_logs"
set "KEYSPACE=user_behavior_analytics"
set "SCRIPT_DIR=%~dp0"

REM Tạo timestamp cho backup
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
set "SNAPSHOT_NAME=backup_%TIMESTAMP%"

REM Định nghĩa đường dẫn backup với quotes
set "BACKUPS_ROOT=%SCRIPT_DIR%backups"
set "BACKUP_DIR=%BACKUPS_ROOT%\%SNAPSHOT_NAME%"

echo =====================================
echo Cassandra Database Backup Script
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

REM Kiểm tra container có đang chạy không
echo Checking if Cassandra container is running...
docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" > nul
if errorlevel 1 (
    echo ERROR: Container %CONTAINER_NAME% is not running!
    echo Please start the container using: docker-compose up -d cassandra
    pause
    exit /b 1
)

REM Tạo snapshot
echo Creating snapshot: %SNAPSHOT_NAME%
docker exec "%CONTAINER_NAME%" nodetool snapshot -t "%SNAPSHOT_NAME%" "%KEYSPACE%"
if errorlevel 1 (
    echo ERROR: Failed to create snapshot!
    pause
    exit /b 1
)

REM Tạo thư mục tạm để copy dữ liệu
set "TEMP_DIR=%BACKUP_DIR%\temp_data"
mkdir "%TEMP_DIR%"

REM Copy snapshot data ra ngoài - Sử dụng cách an toàn hơn
echo Copying snapshot data...
docker exec "%CONTAINER_NAME%" find /var/lib/cassandra/data/%KEYSPACE% -name "*%SNAPSHOT_NAME%*" -type d > "%TEMP%\snapshot_paths.txt"

REM Đọc từng path và copy
for /f "usebackq delims=" %%i in ("%TEMP%\snapshot_paths.txt") do (
    echo Copying snapshot from: %%i
    docker cp "%CONTAINER_NAME%:%%i" "%TEMP_DIR%\"
    if errorlevel 1 (
        echo WARNING: Failed to copy some snapshot data from %%i
    )
)

REM Nếu không có dữ liệu nào được copy, thử cách khác
if not exist "%TEMP_DIR%\*" (
    echo Trying alternative copy method...
    docker exec "%CONTAINER_NAME%" tar -czf /tmp/backup_%SNAPSHOT_NAME%.tar.gz -C /var/lib/cassandra/data %KEYSPACE%
    if not errorlevel 1 (
        docker cp "%CONTAINER_NAME%:/tmp/backup_%SNAPSHOT_NAME%.tar.gz" "%BACKUP_DIR%\"
        docker exec "%CONTAINER_NAME%" rm -f /tmp/backup_%SNAPSHOT_NAME%.tar.gz
        echo Data copied as compressed archive.
    ) else (
        echo ERROR: Failed to copy snapshot data using both methods!
        REM Cleanup on failure
        docker exec "%CONTAINER_NAME%" nodetool clearsnapshot -t "%SNAPSHOT_NAME%"
        rmdir /s /q "%BACKUP_DIR%"
        pause
        exit /b 1
    )
) else (
    echo Snapshot data copied successfully.
)

REM Cleanup temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
if exist "%TEMP%\snapshot_paths.txt" del "%TEMP%\snapshot_paths.txt"

REM Tạo file metadata
echo Creating backup metadata...
(
echo Backup Information
echo ==================
echo Date: %date% %time%
echo Container: %CONTAINER_NAME%
echo Keyspace: %KEYSPACE%
echo Snapshot Name: %SNAPSHOT_NAME%
echo Script Location: %SCRIPT_DIR%
echo Windows Version: 
ver
echo.
echo Docker Info:
docker version --format "Client: {{.Client.Version}} - Server: {{.Server.Version}}"
) > "%BACKUP_DIR%\backup_info.txt"

REM Export database schema
echo Exporting database schema...
docker exec "%CONTAINER_NAME%" cqlsh -e "DESCRIBE KEYSPACE %KEYSPACE%;" > "%BACKUP_DIR%\schema.cql" 2>nul
if errorlevel 1 (
    echo Warning: Could not export schema. Container may not have cqlsh available.
    echo   > "%BACKUP_DIR%\schema_export_failed.txt"
)

REM Tạo file nén nếu có công cụ
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

REM Thử sử dụng 7zip
where 7z >nul 2>nul
if not errorlevel 1 (
    echo Using 7zip to compress...
    7z a -tgzip "%SNAPSHOT_NAME%.tar.gz" "%SNAPSHOT_NAME%\"
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

REM Xóa snapshot trong container để tiết kiệm dung lượng
echo Cleaning up snapshot in container...
docker exec "%CONTAINER_NAME%" nodetool clearsnapshot -t "%SNAPSHOT_NAME%" 2>nul

echo =====================================
echo Backup completed successfully!
echo Backup location: %BACKUPS_ROOT%\%BACKUP_FILE%
echo =====================================

REM Hiển thị thông tin backup
echo Backup size:
if exist "%BACKUPS_ROOT%\%BACKUP_FILE%" (
    for %%F in ("%BACKUPS_ROOT%\%BACKUP_FILE%") do echo   %%~zF bytes
)

echo.
echo Current backups:
dir /B "%BACKUPS_ROOT%" 2>nul

echo.
echo Backup process completed successfully!
echo Press any key to exit...
pause > nul
