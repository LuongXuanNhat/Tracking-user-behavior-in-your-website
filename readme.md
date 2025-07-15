# Các hệ cơ sở dữ liệu

Created: July 8, 2025 9:29 AM
Professor: Nguyễn Thị Thuý Loan

![1.png](Ca%CC%81c%20he%CC%A3%CC%82%20co%CC%9B%20so%CC%9B%CC%89%20du%CC%9B%CC%83%20lie%CC%A3%CC%82u%2022ad0549ccc680dc97f4f4678120e812/1.png)

# 🧠 Kế hoạch triển khai hệ thống theo dõi và phân tích hành vi người dùng (User Tracking System)

## 🌟 Mục tiêu chính

Xây dựng một hệ thống có khả năng:

- Ghi nhận hành vi người dùng trên website (click, cuộn, tìm kiếm, thêm vào giỏ hàng…)
- Lưu trữ và xử lý dữ liệu lớn với hiệu suất cao
- Phân tích, tạo báo cáo chi tiết
- Gợi ý cải thiện giao diện hoặc nội dung để tăng chuyển đổi (từ xem → mua)

---

## 🧱 Thành phần hệ thống

### 1. **Client Kit – Script thu thập hành vi**

- Được viết bằng **JavaScript** chèn vào website
- Tự động bắt các hành vi người dùng (event listener)
- Gửi dữ liệu về backend qua các **API được viết bằng Node.js**
- Có thể tùy chỉnh loại hành vi cần theo dõi

---

### 2. **Core (Node.js + Cassandra) – Xử lý và lưu trữ dữ liệu**

- **Node.js** đảm nhiệm phần backend:
    - Tạo các REST API để nhận dữ liệu từ client
    - Xử lý dữ liệu theo thời gian thực hoặc batch
    - Tối ưu hiệu suất với bất đồng bộ (async/await)
- **Cassandra** được dùng để lưu trữ dữ liệu:
    - Thiết kế schema theo thời gian (time-series)
    - Hỗ trợ phân tán, dung lượng lớn
    - Chịu lỗi tốt, đảm bảo hoạt động ổn định

---

### 3. **Report Assistant – Giao diện phân tích**

- Giao diện frontend (React hoặc HTML/JS đơn giản)
- Gọi API từ Node.js để truy xuất báo cáo
- Hiển thị biểu đồ, top hành vi, xu hướng theo ngày/tuần/tháng
- Có thể mở rộng tích hợp phân tích AI

---

## 🚀 Kế hoạch triển khai theo từng giai đoạn

### 🔹 Giai đoạn 1: Thiết lập hệ thống backend

**1.1 Phân tích hành vi người dùng phổ biến**

- Nghiên cứu các hành vi như click, hover, cuộn, chuyển trang, mua hàng…
- Xây dựng danh sách “user behavior types”

**1.2 Cài đặt Cassandra**

- Cài trên máy hoặc dùng dịch vụ (VD: AstraDB, ScyllaDB…)
- Thiết kế schema: bảng `user_events` gồm các trường như:
    
    ```
    user_id | timestamp | event_type | page_url | metadata
    
    ```
    

**1.3 Viết backend bằng Node.js**

- Cài đặt project với Express.js
- Tạo API:
    - `POST /track` → nhận dữ liệu từ client
    - `GET /report` → truy xuất thống kê
- Kết nối Cassandra bằng thư viện `cassandra-driver`

**1.4 Xây dựng script thu thập**

- Viết JS chèn vào website
- Lắng nghe sự kiện và gửi data bằng `fetch()` hoặc `axios`

---

### 🔹 Giai đoạn 2: Xây dựng frontend báo cáo

**2.1 Xây dựng giao diện Report Assistant**

- Hiển thị:
    - Số lượt truy cập theo thời gian
    - Top hành vi
    - Các hành vi dẫn đến chuyển đổi

**2.2 Viết thêm API Node.js**

- Tạo các endpoint phục vụ frontend:
    - `GET /stats/top-events`
    - `GET /stats/trend`
    - `GET /stats/by-user`

**2.3 Kết nối frontend ↔ backend**

- Gọi API và render dữ liệu dạng bảng hoặc biểu đồ (Chart.js/D3.js)

**2.4 Tối ưu hệ thống**

- Tái cấu trúc mã Node.js
- Index dữ liệu trong Cassandra
- Ghi log, giám sát lỗi và hiệu suất

---

## 🔍 Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Backend | Node.js (Express.js) |
| Database | Cassandra |
| Client Script | JavaScript |
| API | REST (JSON) |
| Báo cáo | HTML/JS (hoặc React) |
| Triển khai | Linux/macOS, VSCode, Postman |

---

## 🧭 Mục tiêu nâng cao

- Dùng AI để phân nhóm người dùng (clustering)
- Dự đoán hành vi và gợi ý sản phẩm
- Hỗ trợ real-time dashboard cho admin

---

**MỤC TIÊU CỦA ĐỒ ÁN
NỘI DUNG LOG CHÍNH
- Lượt click - ảnh , bài đánh giá , bài blog ( 1 )
- Lượt xem	( 2)
- Mở rộng phân tích Từ 1 và 2 =>   (3)	- Dịch vụ nào phổ biến nhất / ít dùng nhất
NHIỆM VỤ: API cho những ý trên , và Script cho log**