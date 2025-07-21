# 📚 Documentation

Thư mục này chứa toàn bộ tài liệu hướng dẫn sử dụng User Behavior Tracking API.

## 📋 Danh sách tài liệu

### 🚀 Quick Start

- [`QUICK_START.md`](./QUICK_START.md) - Hướng dẫn khởi động nhanh trong 3 bước

### 🔑 API Key Management

- [`API_KEY_GUIDE.md`](./API_KEY_GUIDE.md) - Hướng dẫn chi tiết về API keys
- [`HOW_TO_GET_API_KEY.md`](./HOW_TO_GET_API_KEY.md) - Cách lấy API key nhanh nhất

### 📖 API Documentation

- [`API_REFERENCE.md`](./API_REFERENCE.md) - Tài liệu API đầy đủ với examples

## 🎯 Hệ thống API Key đơn giản

API sử dụng **3 API keys cố định** được cấu hình trong file `.env`:

| API Key                      | Mục đích    | Quyền hạn   |
| ---------------------------- | ----------- | ----------- |
| `demo_api_key_abcdefg`       | Demo/Test   | Read-only   |
| `test_api_key_xyz`           | Development | Full access |
| `tracking_api_key_123456789` | Production  | Full access |

## ⚡ Sử dụng nhanh

```bash
# 1. Khởi động server
npm start

# 2. Test API với demo key
curl -H "x-api-key: demo_api_key_abcdefg" \
  http://localhost:3001/api/analytics/clicks
```

## 🔧 Cấu hình

Tất cả API keys được cấu hình trong file `.env`:

```env
PRODUCTION_API_KEY=tracking_api_key_123456789
DEMO_API_KEY=demo_api_key_abcdefg
TEST_API_KEY=test_api_key_xyz
```

## 📝 Ghi chú

- Tài liệu này được cập nhật theo hệ thống API key đơn giản (chỉ dùng .env)
- Không cần database hoặc website management phức tạp
- Phù hợp cho hầu hết các use case tracking cơ bản

---

_Cập nhật lần cuối: 21/07/2025_
