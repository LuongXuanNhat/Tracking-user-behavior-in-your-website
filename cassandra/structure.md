Đây là phiên bản **đơn giản hóa** của thiết kế Cassandra cluster trước đó. Tôi sẽ so sánh hai phiên bản:

## **Tổng quan phiên bản mới (Single DC)**

**Kiến trúc:**

- **1 Cluster**: `UserLogCluster`
- **1 Datacenter**: `datacenter1`
- **3 Nodes**: Tất cả trong cùng datacenter
- **5 Containers total**: 3 Cassandra + 2 support services

## **So sánh với phiên bản cũ:**

| Aspect                 | Phiên bản cũ (Multi-DC) | Phiên bản mới (Single DC) |
| ---------------------- | ----------------------- | ------------------------- |
| **Số Datacenter**      | 3 DC                    | 1 DC                      |
| **Số Cassandra nodes** | 6 nodes                 | 3 nodes                   |
| **Tổng containers**    | 10 containers           | 5 containers              |
| **Monitoring**         | Prometheus + Grafana    | Không có                  |
| **Management**         | Cassandra Web           | Cassandra Web             |
| **Load Balancer**      | HAProxy                 | HAProxy                   |

## **5 containers trong phiên bản mới:**

1. **cassandra_node1** (seed node)
2. **cassandra_node2**
3. **cassandra_node3**
4. **cassandra_web_ui** (quản lý web)
5. **cassandra_load_balancer** (HAProxy)

## **Ưu/nhược điểm:**

**Ưu điểm phiên bản Single DC:**

- ✅ Đơn giản hơn để setup và quản lý
- ✅ Ít tài nguyên hơn (5 vs 10 containers)
- ✅ Khởi động nhanh hơn
- ✅ Phù hợp cho môi trường development/testing

**Nhược điểm:**

- ❌ Không có disaster recovery (chỉ 1 DC)
- ❌ Không có monitoring chi tiết (thiếu Prometheus/Grafana)
- ❌ Khả năng chịu lỗi thấp hơn
- ❌ Không phù hợp cho production multi-region

**Kết luận**: Phiên bản này phù hợp cho **development**, **testing** hoặc **small-scale production** không cần high availability phức tạp.
