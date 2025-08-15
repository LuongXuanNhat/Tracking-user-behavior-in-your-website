# Test Realtime Event Broadcasting

## Tóm tắt các thay đổi đã thực hiện:

### 1. Backend (trackingApi.js)

- ✅ Đã có sẵn việc broadcast event qua Socket.IO
- ✅ Cải thiện broadcast với convert websiteId sang string
- ✅ Thêm debug logs để track việc broadcast
- ✅ Thêm endpoint `/api/tracking/test-broadcast` để test

### 2. Socket Service (socketService.js)

- ✅ Cải thiện debug logs
- ✅ Hiển thị thông tin chi tiết về subscribers

### 3. Frontend (page.tsx)

- ✅ Đã có sẵn logic handle event mới
- ✅ Cải thiện logic pagination khi có event mới
- ✅ Event mới sẽ xuất hiện ở đầu danh sách (trang 1)

## Cách test:

### Bước 1: Chạy server

```bash
cd backend
npm start
```

### Bước 2: Chạy frontend

```bash
cd frontend
npm run dev
```

### Bước 3: Mở website detail page và subscribe

- Mở http://localhost:3000/websites/[websiteId]
- Chuyển sang tab "Realtime Events"
- Kiểm tra console log để đảm bảo socket connected và subscribed

### Bước 4: Test bằng endpoint test

```bash
# Thay YOUR_WEBSITE_ID bằng website ID thực tế
curl -X POST http://localhost:5000/api/tracking/test-broadcast \
  -H "Content-Type: application/json" \
  -d '{"websiteId": "YOUR_WEBSITE_ID"}'
```

### Bước 5: Test bằng tracking API thật

```bash
# Gửi event thật qua tracking API
curl -X POST http://localhost:5000/api/tracking/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "event_type": "pageview",
    "page_url": "https://example.com/test",
    "page_title": "Test Page",
    "visitor_id": "visitor_123",
    "session_id": "session_456"
  }'
```

## Debug logs để kiểm tra:

### Backend console:

- "Event {eventId} broadcasted for website {websiteId}"
- "Attempting to broadcast event for website: {websiteId}"
- "Broadcasting to X users for website {websiteId}"

### Frontend console:

- "New event received:" (với data object)
- "Socket connected"
- "Successfully subscribed to website: {websiteId}"

## Lưu ý:

- Đảm bảo user đã đăng nhập và có quyền access website
- Đảm bảo đã subscribe vào website trước khi test
- Event mới sẽ chỉ hiển thị khi đang ở tab "Realtime Events"
- Nếu không ở trang 1, sẽ có thông báo trong console về event mới
