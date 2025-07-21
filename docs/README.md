# 📚 Documentation

Thư mục này chứa toàn bộ tài liệu hướng dẫn sử dụng User Behavior Tracking API.

## 📋 Danh sách tài liệu

### 🚀 Quick Start

- [`SETUP_AND_TEST.md`](./SETUP_AND_TEST.md) - Hướng dẫn setup và test API
- [`HOW_TO_GET_API_KEY.md`](./HOW_TO_GET_API_KEY.md) - Cách lấy API key nhanh nhất

### 🔑 API Key Management

- [`API_KEY_MANAGEMENT.md`](./API_KEY_MANAGEMENT.md) - **Hệ thống quản lý API keys chuyên nghiệp**
- [`API_KEY_GUIDE.md`](./API_KEY_GUIDE.md) - Hướng dẫn chi tiết về API keys

### 📖 API Documentation

- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) - Tài liệu API đầy đủ với examples

## 🎯 Hệ thống API Key chuyên nghiệp

Hệ thống hỗ trợ **2 phương thức quản lý API keys**:

### 1. 🔧 Development Mode (.env keys)

| API Key                      | Mục đích    | Quyền hạn   |
| ---------------------------- | ----------- | ----------- |
| `demo_api_key_abcdefg`       | Demo/Test   | Read-only   |
| `test_api_key_xyz`           | Development | Full access |
| `tracking_api_key_123456789` | Production  | Full access |

### 2. 🚀 Production Mode (Dynamic keys)

- **Tạo API keys động** cho từng website
- **Quản lý quyền hạn** chi tiết (tracking, analytics, users)
- **Theo dõi usage** và thống kê
- **Hết hạn tự động** theo loại key
- **CLI tools** để quản lý

## ⚡ Sử dụng nhanh

### Development với .env keys

```bash
# 1. Khởi động server
npm start

# 2. Test API với demo key
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

### Production với dynamic keys

```bash
# 1. Tạo API key mới
npm run key:create -- -n "My Website" -u "https://example.com" -t "production"

# 2. Liệt kê tất cả keys
npm run key:list

# 3. Xem thống kê
npm run key:stats

# 4. Vô hiệu hóa key
npm run key:disable 1 -r "No longer needed"
```

## 🔧 Cấu hình

### Development (.env)

```env
PRODUCTION_API_KEY=tracking_api_key_123456789
DEMO_API_KEY=demo_api_key_abcdefg
TEST_API_KEY=test_api_key_xyz
```

### Production (Dynamic)

API keys được lưu trong `data/api-keys.json` và quản lý qua:

- **CLI Tools**: `npm run key:*`
- **REST API**: `/api/keys/*` (cần admin key)
- **Auto-backup**: Tự động lưu khi có thay đổi

## 🎛️ API Key Management Features

### ✨ Tính năng chính

- 🔐 **Tạo keys tự động** với format `tk_timestamp_randomhex`
- ⏰ **Hết hạn tự động**: Demo (30 days), Test (90 days), Production (1 year)
- 📊 **Rate limiting**: Tùy theo loại key
- 🔍 **Usage tracking**: Đếm requests và thời gian sử dụng
- 🚫 **Disable/Enable**: Vô hiệu hóa keys khi cần
- 📈 **Statistics**: Thống kê chi tiết usage

### 🛡️ Bảo mật

- API keys được **mask** khi hiển thị (`tk_12345***`)
- **Fallback** to .env keys cho development
- **Permissions** chi tiết cho từng endpoint
- **Admin-only** access cho management APIs

## 📝 Ghi chú

### 🔄 Migration từ hệ thống cũ

- **.env keys vẫn hoạt động** cho backward compatibility
- **Tự động fallback** khi không tìm thấy dynamic keys
- **Không breaking changes** với code hiện tại

### 🚀 Production Ready

- **In-memory storage** với auto-save to file (demo)
- **Dễ dàng migrate** sang Cassandra/MongoDB
- **CLI tools** cho DevOps automation
- **RESTful APIs** cho web dashboard

### 🎯 Use Cases

- **Development**: Sử dụng .env keys đơn giản
- **Production**: Dynamic keys với full management
- **Enterprise**: Extend sang database backend

---

_Cập nhật lần cuối: 21/07/2025 - Thêm Dynamic API Key Management System_
