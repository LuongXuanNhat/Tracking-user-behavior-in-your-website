# 🔑 Quick Start - Lấy API Key

## ⚡ 3 BƯỚC ĐƠN GIẢN

### 1️⃣ Khởi động API

```bash
npm start
```

### 2️⃣ Lấy API Key

```bash
curl http://localhost:3001/api/keys
```

### 3️⃣ Copy và sử dụng

```bash
# Copy key này:
demo_api_key_abcdefg

# Test luôn:
curl -H "x-api-key: demo_api_key_abcdefg" http://localhost:3001/api/analytics/clicks
```

## 🎯 API Keys có sẵn:

| Key                          | Quyền       | Sử dụng                 |
| ---------------------------- | ----------- | ----------------------- |
| `demo_api_key_abcdefg`       | Read-only   | ✅ Recommended cho test |
| `tracking_api_key_123456789` | Full access | 🚀 Production/Admin     |
| `test_api_key_xyz`           | Full access | 🧪 Development          |

## 📖 Chi tiết: Xem file `API_KEY_GUIDE.md`
