# Cassandra Database Backup Scripts

Thư mục này chứa các script backup cho Cassandra database với hai loại backup khác nhau:

## 📁 Các Files Backup

### 1. Structure Backup (Chỉ cấu trúc DB)

- **`run_backup_fixed.bat`** - Script Windows backup cấu trúc database
- **`run_backup.sh`** - Script Linux backup cấu trúc database

### 2. Full Data Backup (Cấu trúc + Dữ liệu) ⭐ MỚI

- **`run_backup_with_data.bat`** - Script Windows backup đầy đủ dữ liệu
- **`run_backup_with_data.sh`** - Script Linux backup đầy đủ dữ liệu

## 🚀 Cách Sử Dụng

### Windows:

```cmd
# Backup chỉ cấu trúc
run_backup_fixed.bat

# Backup đầy đủ dữ liệu (KHUYÊN DÙNG)
run_backup_with_data.bat
```

### Linux:

```bash
# Backup chỉ cấu trúc
chmod +x run_backup.sh
./run_backup.sh

# Backup đầy đủ dữ liệu (KHUYÊN DÙNG)
chmod +x run_backup_with_data.sh
./run_backup_with_data.sh
```

## 📋 Yêu Cầu Hệ Thống

- Docker đã được cài đặt và chạy
- Container Cassandra đang hoạt động (`cassandra_user_logs`)
- Keyspace `user_behavior_analytics` tồn tại
- Đủ dung lượng disk để lưu backup

## 📦 Nội Dung Backup Đầy Đủ

Khi chạy script backup với dữ liệu, bạn sẽ nhận được:

### Cấu trúc thư mục backup:

```
backups/
└── data_backup_YYYYMMDD_HHMMSS/
    ├── schema/                     # Schema backup
    │   ├── keyspace_schema.cql     # Toàn bộ schema keyspace
    │   ├── table_*_schema.cql      # Schema từng bảng
    │   ├── keyspace_info.txt       # Thông tin keyspace
    │   ├── tables_info.txt         # Thông tin bảng
    │   ├── columns_info.txt        # Thông tin cột
    │   └── indexes_info.txt        # Thông tin index
    ├── data/                       # Data backup
    │   ├── customers_data.csv      # Dữ liệu bảng customers
    │   ├── websites_data.csv       # Dữ liệu bảng websites
    │   ├── events_data.csv         # Dữ liệu bảng events
    │   ├── events_by_user_data.csv # Dữ liệu bảng events_by_user
    │   ├── events_by_type_data.csv # Dữ liệu bảng events_by_type
    │   ├── events_by_session_data.csv # Dữ liệu bảng events_by_session
    │   ├── api_key_websites_data.csv # Dữ liệu bảng api_key_websites
    │   └── *_select_results.txt    # Kết quả SELECT query
    ├── temp_snapshot/              # Snapshot backup (nếu có)
    ├── run_restore_data.bat        # Script restore cho Windows
    ├── run_restore_data.sh         # Script restore cho Linux
    └── backup_info.txt             # Thông tin chi tiết backup
```

## 🔄 Khôi Phục Dữ Liệu

### Từ backup đầy đủ:

1. **Giải nén backup file:**

   ```bash
   # Linux
   tar -xzf data_backup_YYYYMMDD_HHMMSS.tar.gz

   # Windows (nếu dùng zip)
   # Sử dụng WinRAR/7-Zip để giải nén
   ```

2. **Chạy script restore:**

   ```bash
   # Linux
   cd data_backup_YYYYMMDD_HHMMSS
   chmod +x run_restore_data.sh
   ./run_restore_data.sh [container_name] [keyspace_name]

   # Windows
   cd data_backup_YYYYMMDD_HHMMSS
   run_restore_data.bat [container_name] [keyspace_name]
   ```

### Khôi phục thủ công:

1. **Tạo keyspace và tables:**

   ```bash
   docker cp schema/keyspace_schema.cql cassandra_user_logs:/tmp/
   docker exec cassandra_user_logs cqlsh -f /tmp/keyspace_schema.cql
   ```

2. **Import từng bảng:**
   ```bash
   # Ví dụ với bảng customers
   docker cp data/customers_data.csv cassandra_user_logs:/tmp/
   docker exec cassandra_user_logs cqlsh -e "COPY user_behavior_analytics.customers FROM '/tmp/customers_data.csv' WITH HEADER=true;"
   ```

## ⚠️ Lưu Ý Quan Trọng

### Thời gian backup:

- **Structure backup**: Nhanh (1-5 phút)
- **Full data backup**: Lâu hơn tùy thuộc vào lượng dữ liệu (5-60 phút+)

### Dung lượng:

- Data backup có thể rất lớn với bảng `events`
- Đảm bảo đủ disk space trước khi backup

### Performance:

- Backup trong giờ thấp điểm để tránh ảnh hưởng performance
- Với dữ liệu lớn, cân nhắc backup từng bảng riêng lẻ

## 🛠️ Troubleshooting

### Lỗi thường gặp:

1. **Container không chạy:**

   ```bash
   docker-compose up -d cassandra
   ```

2. **Không có quyền ghi file:**

   ```bash
   # Linux
   sudo chmod 755 run_backup_with_data.sh

   # Windows: Chạy Command Prompt as Administrator
   ```

3. **Thiếu dung lượng disk:**

   ```bash
   # Kiểm tra dung lượng
   df -h  # Linux
   dir    # Windows
   ```

4. **CQL export lỗi:**
   - Kiểm tra container Cassandra có cqlsh không
   - Thử backup từng bảng riêng lẻ
   - Kiểm tra log container: `docker logs cassandra_user_logs`

### Kiểm tra backup thành công:

```bash
# Kiểm tra file backup được tạo
ls -la backups/

# Kiểm tra nội dung backup
ls -la backups/data_backup_*/

# Kiểm tra dữ liệu trong CSV
head -n 5 backups/data_backup_*/data/customers_data.csv
```

## 📊 So Sánh Các Loại Backup

| Tính năng     | Structure Backup | Full Data Backup |
| ------------- | ---------------- | ---------------- |
| Tốc độ        | ⭐⭐⭐⭐⭐       | ⭐⭐⭐           |
| Dung lượng    | ⭐⭐⭐⭐⭐       | ⭐⭐             |
| Độ hoàn chỉnh | ⭐⭐             | ⭐⭐⭐⭐⭐       |
| Khôi phục     | Schema only      | Full restoration |
| Khuyên dùng   | Development      | Production       |

## 📝 Lịch Sử Versions

- **v1.0** - `run_backup_fixed.bat` - Structure backup only
- **v2.0** - `run_backup_with_data.bat/sh` - Full data backup with restore scripts

---

**Lưu ý:** Luôn test restore trên môi trường development trước khi áp dụng vào production!
