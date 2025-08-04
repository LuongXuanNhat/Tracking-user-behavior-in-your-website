# Cassandra Database Backup & Restore Guide

Hướng dẫn đầy đủ về cách backup và restore database Cassandra trong dự án User Behavior Analytics.

## 📋 Tổng quan

Dự án sử dụng Apache Cassandra để lưu trữ dữ liệu user behavior. Để đảm bảo an toàn dữ liệu, cần thực hiện backup định kỳ và có khả năng restore khi cần thiết.

### Cấu hình hiện tại:

- **Container Name**: `cassandra_user_logs`
- **Keyspace**: `user_behavior_analytics`
- **Port**: `9042`
- **Data Volume**: `cassandra_data`

## 🔧 Cài đặt và Yêu cầu

### Yêu cầu hệ thống:

- Docker và Docker Compose đã cài đặt
- Container Cassandra đang chạy
- 7zip (Windows) hoặc tar (Linux/Mac) để nén/giải nén backup

### Kiểm tra container:

```bash
docker ps | grep cassandra_user_logs
```

### Khởi động container nếu cần:

```bash
docker-compose up -d cassandra
```

## 💾 Backup Database

### Phương pháp 1: Sử dụng Script tự động (Khuyến nghị)

#### Windows:

```cmd
cd share
backup_cassandra.bat
```

#### Linux/Mac:

```bash
cd share
chmod +x backup_cassandra.sh
./backup_cassandra.sh
```

### Phương pháp 2: Manual Backup

#### Bước 1: Tạo snapshot

```bash
docker exec cassandra_user_logs nodetool snapshot -t backup_$(date +%Y%m%d_%H%M%S) user_behavior_analytics
```

#### Bước 2: Copy dữ liệu ra ngoài

```bash
docker cp cassandra_user_logs:/var/lib/cassandra/data/user_behavior_analytics ./backup_$(date +%Y%m%d_%H%M%S)
```

#### Bước 3: Xóa snapshot trong container

```bash
docker exec cassandra_user_logs nodetool clearsnapshot -t backup_$(date +%Y%m%d_%H%M%S)
```

### Backup định kỳ với Cron (Linux/Mac)

Tạo cron job để backup tự động:

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau để backup hàng ngày lúc 2:00 AM
0 2 * * * cd /path/to/project/share && ./backup_cassandra.sh

# Backup hàng tuần vào Chủ nhật lúc 3:00 AM
0 3 * * 0 cd /path/to/project/share && ./backup_cassandra.sh
```

### Backup định kỳ với Task Scheduler (Windows)

1. Mở Task Scheduler
2. Tạo Basic Task
3. Đặt tên: "Cassandra Daily Backup"
4. Trigger: Daily tại 2:00 AM
5. Action: Start a program
6. Program: `cmd.exe`
7. Arguments: `/c "cd /d D:\BTMONHOC\SĐH\DB enhance\Source\share && backup_cassandra.bat"`

## 🔄 Restore Database

### ⚠️ Cảnh báo quan trọng:

- Restore sẽ **GHI ĐÈ** toàn bộ dữ liệu hiện tại
- Luôn tạo backup trước khi restore
- Đảm bảo application không đang sử dụng database

### Phương pháp 1: Sử dụng Script tự động (Khuyến nghị)

#### Bước 1: Liệt kê các backup có sẵn

```cmd
cd share
dir backups
```

#### Bước 2: Restore

**Windows:**

```cmd
restore_cassandra.bat backup_20250804_143022
```

**Linux/Mac:**

```bash
./restore_cassandra.sh backup_20250804_143022
```

### Phương pháp 2: Manual Restore

#### Bước 1: Dừng ứng dụng

```bash
docker-compose stop
```

#### Bước 2: Giải nén backup (nếu cần)

```bash
cd share/backups
tar -xzf backup_20250804_143022.tar.gz
```

#### Bước 3: Khởi động lại Cassandra

```bash
docker-compose up -d cassandra
```

#### Bước 4: Đợi Cassandra sẵn sàng

```bash
docker exec cassandra_user_logs cqlsh -e "DESCRIBE KEYSPACES;"
```

#### Bước 5: Copy dữ liệu vào container

```bash
docker cp backup_20250804_143022 cassandra_user_logs:/tmp/restore_data
```

#### Bước 6: Restore dữ liệu

```bash
docker exec cassandra_user_logs bash -c "
    cp -r /tmp/restore_data/* /var/lib/cassandra/data/ &&
    chown -R cassandra:cassandra /var/lib/cassandra/data &&
    rm -rf /tmp/restore_data
"
```

#### Bước 7: Refresh keyspace

```bash
docker exec cassandra_user_logs nodetool refresh user_behavior_analytics
```

#### Bước 8: Khởi động lại ứng dụng

```bash
docker-compose up -d
```

## 📁 Cấu trúc Backup

### Thư mục backup:

```
share/
├── backups/
│   ├── backup_20250804_143022/          # Backup folder
│   │   ├── websites/                    # Table data
│   │   ├── users/
│   │   ├── events/
│   │   └── backup_info.txt              # Metadata
│   ├── backup_20250804_143022.tar.gz    # Compressed backup
│   └── backup_20250805_020000.tar.gz
├── backup_cassandra.bat                 # Windows backup script
├── backup_cassandra.sh                  # Linux/Mac backup script
├── restore_cassandra.bat                # Windows restore script
├── restore_cassandra.sh                 # Linux/Mac restore script
└── README_BACKUP.md                     # Script documentation
```

### Metadata file (backup_info.txt):

```
Backup Information
==================
Date: Sun 08/04/2025 14:30:22
Container: cassandra_user_logs
Keyspace: user_behavior_analytics
Snapshot Name: backup_20250804_143022
Script Location: D:\BTMONHOC\SĐH\DB enhance\Source\share
```

## 🛠️ Troubleshooting

### Lỗi thường gặp:

#### 1. Container không chạy

```bash
# Kiểm tra trạng thái
docker ps -a | grep cassandra

# Khởi động container
docker-compose up -d cassandra

# Xem logs
docker logs cassandra_user_logs
```

#### 2. Không đủ dung lượng

```bash
# Kiểm tra dung lượng
docker exec cassandra_user_logs df -h

# Xóa snapshot cũ
docker exec cassandra_user_logs nodetool clearsnapshot
```

#### 3. Backup bị lỗi

```bash
# Kiểm tra trạng thái Cassandra
docker exec cassandra_user_logs nodetool status

# Kiểm tra các snapshot hiện tại
docker exec cassandra_user_logs nodetool listsnapshots
```

#### 4. Restore thất bại

```bash
# Kiểm tra quyền file
docker exec cassandra_user_logs ls -la /var/lib/cassandra/data/

# Sửa quyền
docker exec cassandra_user_logs chown -R cassandra:cassandra /var/lib/cassandra/data/
```

### Kiểm tra tính toàn vẹn dữ liệu:

#### Trước backup:

```sql
-- Kết nối vào Cassandra
docker exec -it cassandra_user_logs cqlsh

-- Kiểm tra số lượng record
USE user_behavior_analytics;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM websites;
SELECT COUNT(*) FROM events;
```

#### Sau restore:

```sql
-- Kiểm tra lại số lượng record
USE user_behavior_analytics;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM websites;
SELECT COUNT(*) FROM events;

-- Kiểm tra dữ liệu mẫu
SELECT * FROM users LIMIT 5;
SELECT * FROM websites LIMIT 5;
```

## 📊 Monitoring và Báo cáo

### Script kiểm tra backup:

```bash
#!/bin/bash
# check_backup_status.sh

BACKUP_DIR="./share/backups"
DAYS_TO_KEEP=30

echo "=== Backup Status Report ==="
echo "Backup Directory: ${BACKUP_DIR}"
echo "Backups found:"
ls -la "${BACKUP_DIR}" | grep backup_

echo ""
echo "=== Cleanup old backups (older than ${DAYS_TO_KEEP} days) ==="
find "${BACKUP_DIR}" -name "backup_*" -type f -mtime +${DAYS_TO_KEEP} -delete
```

### Log backup activities:

```bash
# Thêm vào script backup
echo "$(date): Backup completed successfully" >> ./logs/backup.log
```

## 🔐 Bảo mật Backup

### Mã hóa backup:

```bash
# Mã hóa backup với GPG
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
    --output backup_encrypted.tar.gz.gpg backup.tar.gz

# Giải mã
gpg --output backup.tar.gz --decrypt backup_encrypted.tar.gz.gpg
```

### Upload backup lên cloud:

```bash
# AWS S3
aws s3 cp backup_20250804_143022.tar.gz s3://your-backup-bucket/cassandra/

# Google Cloud Storage
gsutil cp backup_20250804_143022.tar.gz gs://your-backup-bucket/cassandra/
```

## 📝 Best Practices

1. **Backup định kỳ**: Thiết lập backup tự động hàng ngày
2. **Retention policy**: Giữ backup 30 ngày gần nhất, weekly backup 3 tháng
3. **Test restore**: Thường xuyên test restore process
4. **Multiple locations**: Lưu backup ở nhiều nơi khác nhau
5. **Documentation**: Ghi chép chi tiết mỗi lần backup/restore
6. **Monitoring**: Thiết lập alert khi backup thất bại
7. **Encryption**: Mã hóa backup sensitive data
8. **Access control**: Giới hạn quyền truy cập backup

## 🚨 Recovery Scenarios

### Scenario 1: Container bị corrupt

1. Stop container
2. Remove container and volume
3. Recreate container
4. Restore từ backup mới nhất

### Scenario 2: Data corruption

1. Identify corrupted tables
2. Stop application
3. Restore affected tables từ backup
4. Verify data integrity
5. Restart application

### Scenario 3: Disaster recovery

1. Setup new environment
2. Install Docker và Cassandra
3. Restore từ off-site backup
4. Update configuration
5. Test thoroughly

---

**Lưu ý**: Luôn test backup và restore process trong môi trường development trước khi áp dụng cho production.
