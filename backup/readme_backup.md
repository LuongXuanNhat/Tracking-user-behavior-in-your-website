# Hướng Dẫn Sử Dụng Backup Database Cassandra

## Mô Tả

Thư mục `backup` chứa các script tự động backup database Cassandra cho hệ thống tracking user behavior. Khi chạy script, hệ thống sẽ tự động:

1. Tạo snapshot của database
2. Tạo thư mục backup với timestamp
3. Copy dữ liệu từ container ra ngoài
4. Tạo file metadata và schema
5. Nén backup thành file .tar.gz (nếu có công cụ nén)
6. Dọn dẹp snapshot trong container

## Cấu Trúc Files

```
backup/
├── run_backup.bat          # Script backup cho Windows (bản gốc)
├── run_backup_fixed.bat    # Script backup cho Windows (bản sửa lỗi)
├── run_backup.sh           # Script backup cho Linux/Mac
├── readme_backup.md        # File hướng dẫn này
└── backups/                # Thư mục chứa các backup (tự động tạo)
    ├── backup_20250816_143025.tar.gz
    ├── backup_20250816_150312.tar.gz
    └── ...
```

## ⚠️ Lưu Ý Quan Trọng

**Nếu gặp lỗi path với `run_backup.bat`, hãy sử dụng `run_backup_fixed.bat`**

Lỗi thường gặp:

```
CreateFile D:\BTMONHOC\SĐH\DB enhance\Source\backup\backups\backup_...": The filename, directory name, or volume label syntax is incorrect.
```

**Nguyên nhân**: Đường dẫn có dấu cách và ký tự đặc biệt khiến Docker command bị lỗi.

**Giải pháp**: Sử dụng `run_backup_fixed.bat` - phiên bản đã được cải tiến để xử lý đường dẫn an toàn hơn.## Yêu Cầu Hệ Thống

- Docker đã được cài đặt và chạy
- Container Cassandra (`cassandra_user_logs`) đang hoạt động
- Keyspace `user_behavior_analytics` tồn tại trong database

## Cách Sử Dụng

### Windows

1. Mở Command Prompt hoặc PowerShell
2. Di chuyển đến thư mục backup:
   ```cmd
   cd "backup"
   ```
3. Chạy script backup (khuyến nghị sử dụng bản fixed):

   ```cmd
   run_backup_fixed.bat
   ```

   **Hoặc nếu muốn thử bản gốc:**

   ```cmd
   run_backup.bat
   ```

### Linux/Mac

1. Mở Terminal
2. Di chuyển đến thư mục backup:
   ```bash
   cd "/path/to/backup"
   ```
3. Cấp quyền thực thi cho script (chỉ cần làm 1 lần):
   ```bash
   chmod +x run_backup.sh
   ```
4. Chạy script backup:
   ```bash
   ./run_backup.sh
   ```

## Cấu Trúc Backup

Mỗi backup sẽ chứa:

- **Dữ liệu database**: Toàn bộ data của keyspace `user_behavior_analytics`
- **backup_info.txt**: Thông tin metadata về backup (ngày tạo, container, keyspace...)
- **schema.cql**: Schema definition của database (nếu export thành công)

## Format Tên Backup

Backup được đặt tên theo format: `backup_YYYYMMDD_HHMMSS`

Ví dụ: `backup_20250816_143025.tar.gz`

- 2025: Năm
- 08: Tháng
- 16: Ngày
- 14: Giờ
- 30: Phút
- 25: Giây

## Xử Lý Lỗi

### ⚠️ Lỗi Path/Đường dẫn (Phổ biến nhất)

```
CreateFile D:\BTMONHOC\SĐH\DB enhance\Source\backup\backups\backup_...": The filename, directory name, or volume label syntax is incorrect.
ERROR: Failed to copy snapshot data!
```

**Nguyên nhân**:

- Đường dẫn có dấu cách và ký tự đặc biệt (như "SĐH", "DB enhance")
- Docker command không xử lý được đường dẫn có ký tự Unicode

**Giải pháp**:

1. **Sử dụng `run_backup_fixed.bat`** thay vì `run_backup.bat`
2. Script fixed có nhiều cách backup khác nhau để tránh lỗi path
3. Nếu vẫn lỗi, di chuyển project đến đường dẫn không có dấu cách và ký tự đặc biệt

### Container không chạy

```
ERROR: Container cassandra_user_logs is not running!
```

**Giải pháp**: Khởi động container bằng lệnh:

```bash
docker-compose up -d cassandra
```

### Không thể tạo snapshot

```
ERROR: Failed to create snapshot!
```

**Giải pháp**:

- Kiểm tra container có đủ dung lượng không
- Kiểm tra quyền truy cập của container
- Restart container nếu cần

### Không thể copy dữ liệu

```
ERROR: Failed to copy snapshot data!
```

**Giải pháp**:

- Kiểm tra quyền ghi vào thư mục backup
- Kiểm tra dung lượng ổ đĩa
- Đảm bảo đường dẫn tồn tại

## Khôi Phục Backup

Để khôi phục backup, bạn có thể:

1. **Sử dụng script khôi phục có sẵn** (trong thư mục `share`):

   ```cmd
   # Windows
   cd share
   restore_cassandra.bat backup_20250816_143025

   # Linux/Mac
   cd share
   ./restore_cassandra.sh backup_20250816_143025
   ```

2. **Khôi phục thủ công**:
   - Giải nén backup
   - Copy dữ liệu vào container
   - Restart Cassandra
   - Import schema nếu cần

## Quản Lý Backup

### Xem danh sách backup

```cmd
# Windows
dir backups

# Linux/Mac
ls -la backups/
```

### Xóa backup cũ

```cmd
# Windows - xóa backup cũ hơn 30 ngày
forfiles /p backups /s /m *.* /d -30 /c "cmd /c del @path"

# Linux/Mac - xóa backup cũ hơn 30 ngày
find backups/ -name "backup_*" -mtime +30 -delete
```

## Lưu Ý Quan Trọng

1. **Dung lượng**: Backup có thể chiếm nhiều dung lượng, hãy theo dõi thường xuyên
2. **Tần suất**: Nên backup định kỳ (hàng ngày/tuần) tùy theo mức độ quan trọng của dữ liệu
3. **Bảo mật**: Backup chứa dữ liệu nhạy cảm, cần bảo vệ thích hợp
4. **Kiểm tra**: Thỉnh thoảng kiểm tra backup có khôi phục được không

## Troubleshooting

### Script không chạy được

- **Windows**: Kiểm tra quyền Administrator
- **Linux/Mac**: Kiểm tra quyền execute (`chmod +x`)

### Docker command not found

Đảm bảo Docker đã được cài đặt và thêm vào PATH

### Backup bị lỗi giữa chừng

Script sẽ tự động dọn dẹp snapshot trong container, nhưng có thể cần kiểm tra thủ công:

```bash
docker exec cassandra_user_logs nodetool listsnapshots
docker exec cassandra_user_logs nodetool clearsnapshot
```

## Hỗ Trợ

Nếu gặp vấn đề, hãy kiểm tra:

1. Log của Docker container
2. Dung lượng ổ đĩa
3. Quyền truy cập file/folder
4. Kết nối mạng với container

---

**Lưu ý**: Script này được thiết kế cho hệ thống User Behavior Analytics với Cassandra. Hãy đảm bảo cấu hình phù hợp với môi trường của bạn.
