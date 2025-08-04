# Cassandra Backup & Restore Scripts

Thư mục này chứa các script để backup và restore database Cassandra.

## Files

- `backup_cassandra.bat` - Script backup cho Windows
- `backup_cassandra.sh` - Script backup cho Linux/Mac
- `restore_cassandra.bat` - Script restore cho Windows
- `restore_cassandra.sh` - Script restore cho Linux/Mac

## Cách sử dụng

### Backup

**Windows:**

```cmd
cd share
backup_cassandra.bat
```

**Linux/Mac:**

```bash
cd share
chmod +x backup_cassandra.sh
./backup_cassandra.sh
```

### Restore

**Windows:**

```cmd
cd share
restore_cassandra.bat [backup_name]
```

**Linux/Mac:**

```bash
cd share
chmod +x restore_cassandra.sh
./restore_cassandra.sh [backup_name]
```

## Cấu trúc backup

Backup sẽ được lưu trong thư mục `share/backups/` với format:

- `backup_YYYYMMDD_HHMMSS/` - Thư mục chứa dữ liệu
- `backup_YYYYMMDD_HHMMSS.tar.gz` - File nén (nếu có 7zip/tar)

## Lưu ý

1. Container Cassandra phải đang chạy khi backup/restore
2. Backup sẽ tự động xóa snapshot trong container sau khi copy
3. Restore sẽ ghi đè lên dữ liệu hiện tại
4. Cần cài đặt 7zip (Windows) hoặc tar (Linux/Mac) để nén/giải nén

## Cấu hình

Các thông số cấu hình trong script:

- `CONTAINER_NAME`: tên container Cassandra
- `KEYSPACE`: tên keyspace cần backup
- `BACKUP_DIR`: thư mục lưu backup

## Troubleshooting

### Container không chạy

```bash
docker-compose up -d cassandra
```

### Kiểm tra logs

```bash
docker logs cassandra_user_logs
```

### Kiểm tra snapshot

```bash
docker exec cassandra_user_logs nodetool listsnapshots
```
