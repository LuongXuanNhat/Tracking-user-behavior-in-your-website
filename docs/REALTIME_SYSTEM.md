# Realtime Events System

Hệ thống tracking realtime events cho website sử dụng Socket.IO và Cassandra, tối ưu cho hiệu năng cao.

## Tính năng chính

### Backend

- **Socket.IO Server**: Xử lý kết nối realtime và broadcast events
- **Authentication**: JWT-based authentication cho socket connections
- **Website Subscription**: Users chỉ nhận events từ websites họ có quyền truy cập
- **Cassandra Optimization**: Tận dụng điểm mạnh về đọc của Cassandra với:
  - Partition by website_id và event_date
  - Clustering by event_time để sắp xếp thời gian
  - Realtime API endpoints tối ưu

### Frontend

- **Tab Interface**: 2 tabs cho Analytics và Realtime
- **Analytics Tab**: Bộ lọc và phân tích như cũ
- **Realtime Tab**: Hiển thị events mới trong thời gian thực
- **Socket Connection Status**: Hiển thị trạng thái kết nối
- **Auto-refresh**: Tự động cập nhật khi có events mới

## Cấu trúc Files

### Backend

```
backend/
├── app/
│   ├── services/
│   │   └── socketService.js       # Socket.IO service chính
│   ├── api/
│   │   ├── trackingApi.js         # Đã cập nhật để broadcast events
│   │   └── realtimeApi.js         # API endpoints cho realtime
│   ├── routes/
│   │   └── realtime.js           # Routes cho realtime API
│   └── models/
│       └── Event.js              # Đã thêm methods tối ưu cho Cassandra
└── server.js                     # Đã tích hợp Socket.IO
```

### Frontend

```
frontend/
├── app/
│   ├── service/
│   │   └── socketService.ts      # Socket.IO client service
│   └── websites/
│       └── [websiteId]/
│           └── page.tsx          # Đã cập nhật với tabs và realtime
```

## API Endpoints

### Realtime API

- `GET /api/realtime/events/:websiteId` - Lấy events với pagination
- `GET /api/realtime/events/:websiteId/range` - Lấy events theo date range
- `GET /api/realtime/events/:websiteId/stream` - Stream events gần nhất

### Socket Events

- `subscribe_website` - Subscribe vào events của website
- `unsubscribe_website` - Unsubscribe khỏi website
- `new_event` - Nhận event mới (broadcast)

## Cassandra Optimization

### Query Patterns

1. **Realtime Events**: Partition by `website_id + event_date`, order by `event_time DESC`
2. **Date Range**: Query multiple partitions cho multiple dates
3. **Recent Events**: Query với time filter để lấy events trong khoảng thời gian gần

### Performance Benefits

- **Fast Reads**: Cassandra tối ưu cho read operations
- **Time-series Data**: Clustering by event_time cho sorted results
- **Scalability**: Partition by website_id + date để distribute data

## Setup Instructions

1. **Install Dependencies**:

   ```bash
   # Backend
   npm install socket.io jsonwebtoken

   # Frontend
   cd frontend
   npm install socket.io-client
   ```

2. **Environment Variables**:

   ```bash
   # Backend .env
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:3000

   # Frontend .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```

3. **Start Services**:

   ```bash
   # Terminal 1 - Backend
   npm run start:backend

   # Terminal 2 - Frontend
   npm run start:frontend
   ```

## Usage

1. **Authentication**: User phải đăng nhập để connect socket
2. **Website Access**: Chỉ receive events từ websites user có quyền
3. **Realtime Tab**: Switch sang tab "Realtime Events" để xem events live
4. **Connection Status**: Green dot = connected, Red dot = disconnected

## Testing

1. Truy cập website tracking và tạo events (click, pageview, etc.)
2. Mở dashboard, vào detail website
3. Switch sang tab "Realtime Events"
4. Observe events appear ngay lập tức khi được tạo

## Architecture Benefits

1. **Scalability**: Socket.IO rooms cho efficient broadcasting
2. **Security**: JWT authentication + website-level authorization
3. **Performance**: Cassandra optimization cho time-series data
4. **User Experience**: Realtime updates without manual refresh
5. **Resource Efficient**: Users chỉ subscribe vào websites họ quan tâm
