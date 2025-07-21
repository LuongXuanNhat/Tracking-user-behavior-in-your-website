# 🚀 Hướng dẫn cài đặt và test User Behavior Tracking API

## 🎯 CÁCH NHANH NHẤT - CHẠY SCRIPT TỰ ĐỘNG

### ⚡ Chỉ cần 1 lệnh duy nhất:

```bash
./run_api.sh
```

**Script này sẽ tự động:**

- ✅ Kiểm tra Node.js, npm, curl
- ✅ Kiểm tra cấu trúc project
- ✅ Cài đặt dependencies nếu thiếu
- ✅ Xử lý port conflict
- ✅ Khởi động server
- ✅ Test 7 endpoints API
- ✅ Báo cáo kết quả chi tiết
- ❌ Hiển thị lỗi cụ thể để fix

**Kết quả:**

- 🎉 **ALL TESTS PASSED**: API sẵn sàng sử dụng
- ❌ **CÓ LỖI**: Script báo lỗi chi tiết để khắc phục

---

## 📋 Yêu cầu hệ thống

- **Node.js**: v18.x hoặc cao hơn
- **npm**: v8.x hoặc cao hơn
- **Terminal/Command Line**
- **Browser** (để test demo)
- **Postman** (tùy chọn, để test API)

---

## 🔧 CÁCH THỦ CÔNG - Cài đặt và khởi động từng bước

> **Lưu ý:** Nếu script `./run_api.sh` hoạt động tốt, không cần làm các bước thủ công bên dưới.

### Bước 1: Cài đặt dependencies

```bash
cd .../Tracking-user-behavior-in-your-website
npm install
```

**Expected output:**

```
added 164 packages, and audited 164 packages in 2s
38 packages are looking for funding
  run `npm fund` for details
found 0 vulnerabilities
```

### Bước 2: Khởi động server

```bash
npm start
```

**Expected output:**

```
> user-behavior-tracking@1.0.0 start
> node server.js
Server is running at http://localhost:3001
```

✅ **Server đã sẵn sàng!** API đang chạy tại `http://localhost:3001`

---

## 🧪 CHI TIẾT CÁC TEST API

> **Lưu ý:** Script `./run_api.sh` đã tự động test tất cả endpoints này. Các lệnh curl bên dưới chỉ để tham khảo.

### Test 1: Main endpoint

```bash
curl http://localhost:3001/
```

**Expected response:**

```json
{
  "status": "success",
  "message": "User Behavior Tracking API is working!",
  "version": "1.0.0",
  "endpoints": {
    "users": "/api/users",
    "tracking": "/api/tracking",
    "analytics": "/api/analytics"
  }
}
```

### Test 2: Health check

```bash
curl http://localhost:3001/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-07-21T02:48:00.000Z",
  "uptime": 120.5
}
```

### Test 3: Users API

```bash
curl http://localhost:3001/api/users
```

**Expected response:**

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "created_at": "2025-07-21T02:48:00.000Z"
    },
    {
      "id": 2,
      "name": "Bob",
      "email": "bob@example.com",
      "created_at": "2025-07-21T02:48:00.000Z"
    }
  ]
}
```

### Test 4: Tạo user mới

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'
```

**Expected response:**

```json
{
  "status": "success",
  "data": {
    "id": 3,
    "name": "Test User",
    "email": "test@example.com",
    "created_at": "2025-07-21T02:48:00.000Z",
    "updated_at": "2025-07-21T02:48:00.000Z"
  }
}
```

### Test 5: Track event (Core feature)

```bash
curl -X POST http://localhost:3001/api/tracking/event \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "event_type": "click",
    "element_type": "image",
    "page_url": "https://example.com/portfolio",
    "element_id": "hero-banner",
    "metadata": {
      "coordinates": {"x": 100, "y": 200},
      "element_text": "Hero Image"
    }
  }'
```

**Expected response:**

```json
{
  "status": "success",
  "message": "Event tracked successfully",
  "data": {
    "event_id": 1,
    "timestamp": "2025-07-21T02:48:00.000Z"
  }
}
```

### Test 6: Analytics - Click statistics

```bash
curl http://localhost:3001/api/analytics/clicks
```

**Expected response:** Data về thống kê clicks theo element type

### Test 7: Analytics - Popular services

```bash
curl http://localhost:3001/api/analytics/popular-services
```

**Expected response:** Data về dịch vụ phổ biến nhất/ít nhất

---

## 🌐 Test bằng Browser

### Cách 1: Test main endpoint

1. Mở browser
2. Truy cập: `http://localhost:3001`
3. Kiểm tra JSON response hiển thị đúng

### Cách 2: Test với demo page

1. Mở file: `frontend/demo.html` trong browser
2. Thực hiện các hành động: click, scroll, hover
3. Kiểm tra tracking events trong console
4. Xem tracking status ở góc phải màn hình

---

## 📊 Test với Postman

### Import Collection

1. Mở Postman
2. Create new Collection: "User Behavior Tracking"
3. Add requests theo các endpoints trong `API_DOCUMENTATION.md`

### Test requests

1. **GET** `http://localhost:3001/health`
2. **GET** `http://localhost:3001/api/users`
3. **POST** `http://localhost:3001/api/users` (with body)
4. **POST** `http://localhost:3001/api/tracking/event` (with body)
5. **GET** `http://localhost:3001/api/analytics/clicks`
6. **GET** `http://localhost:3001/api/analytics/popular-services`

---

## ✅ Checklist - API hoạt động đúng khi:

- [ ] Server khởi động thành công (port 3001)
- [ ] Main endpoint trả về JSON với status "success"
- [ ] Health check trả về status "healthy"
- [ ] Users API trả về danh sách users
- [ ] Có thể tạo user mới thành công
- [ ] Tracking events được ghi nhận
- [ ] Analytics endpoints trả về data
- [ ] Demo page tracking hoạt động

---

## 🐛 Troubleshooting

### Lỗi "Port already in use"

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Hoặc thay đổi port trong server.js
```

### Lỗi "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Lỗi CORS khi test từ browser

- API đã config CORS, nhưng nếu vẫn lỗi:
- Check browser console
- Thử disable browser security (development only)

---

## 📈 Kết quả mong đợi

Sau khi chạy tất cả tests, bạn sẽ có:

1. ✅ **Server running** tại localhost:3001
2. ✅ **All endpoints responding** với status 200/201
3. ✅ **JSON responses** đúng format
4. ✅ **Tracking events** được ghi nhận
5. ✅ **Analytics data** được trả về
6. ✅ **Demo page** tracking hoạt động

---

## 🎯 TÓM TẮT CÁCH SỬ DỤNG

### 🚀 Khởi động nhanh:

```bash
./run_api.sh
```

### 🌐 Sau khi API chạy thành công:

- **API URL**: `http://localhost:3001`
- **Demo page**: Mở `frontend/demo.html` trong browser
- **API Documentation**: Xem file `API_DOCUMENTATION.md`

### 🛑 Dừng server:

- Nhấn `Ctrl + C` trong terminal đang chạy API

---

## 📊 Mục tiêu đề bài đã đạt được

1. **✅ API track lượt click** - ảnh, bài đánh giá, bài blog
2. **✅ API track lượt xem**
3. **✅ API phân tích** dịch vụ phổ biến/ít dùng
4. **✅ Client script** tracking tự động
5. **✅ RESTful API** đầy đủ endpoints

**🎉 API Backend đã sẵn sàng cho production!**
