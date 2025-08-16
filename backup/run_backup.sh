#!/bin/bash

# ===================================
# Cassandra Database Backup Script
# ===================================

# Configuration
CONTAINER_NAME="cassandra_user_logs"
KEYSPACE="user_behavior_analytics"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATE_TIME=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="backup_${DATE_TIME}"
BACKUP_DIR="${SCRIPT_DIR}/backups/${SNAPSHOT_NAME}"

echo "====================================="
echo "Cassandra Database Backup Script"
echo "====================================="
echo "Container: ${CONTAINER_NAME}"
echo "Keyspace: ${KEYSPACE}"
echo "Backup Directory: ${BACKUP_DIR}"
echo "Snapshot Name: ${SNAPSHOT_NAME}"
echo "====================================="

# Tạo thư mục backup nếu chưa có
if [ ! -d "${SCRIPT_DIR}/backups" ]; then
    echo "Creating backups directory..."
    mkdir -p "${SCRIPT_DIR}/backups"
fi

if [ ! -d "${BACKUP_DIR}" ]; then
    echo "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
fi

# Kiểm tra container có đang chạy không
echo "Checking if Cassandra container is running..."
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "ERROR: Container ${CONTAINER_NAME} is not running!"
    echo "Please start the container using: docker-compose up -d cassandra"
    exit 1
fi

# Tạo snapshot
echo "Creating snapshot: ${SNAPSHOT_NAME}"
if ! docker exec "${CONTAINER_NAME}" nodetool snapshot -t "${SNAPSHOT_NAME}" "${KEYSPACE}"; then
    echo "ERROR: Failed to create snapshot!"
    exit 1
fi

# Copy snapshot data ra ngoài
echo "Copying snapshot data..."
if ! docker cp "${CONTAINER_NAME}:/var/lib/cassandra/data/${KEYSPACE}" "${BACKUP_DIR}/"; then
    echo "ERROR: Failed to copy snapshot data!"
    # Cleanup on failure
    docker exec "${CONTAINER_NAME}" nodetool clearsnapshot -t "${SNAPSHOT_NAME}"
    exit 1
fi

# Tạo file metadata
echo "Creating backup metadata..."
cat > "${BACKUP_DIR}/backup_info.txt" << EOF
Backup Information
==================
Date: $(date)
Container: ${CONTAINER_NAME}
Keyspace: ${KEYSPACE}
Snapshot Name: ${SNAPSHOT_NAME}
Script Location: ${SCRIPT_DIR}
EOF

# Copy database schema
echo "Copying database schema..."
docker exec "${CONTAINER_NAME}" cqlsh -e "DESCRIBE KEYSPACE ${KEYSPACE};" > "${BACKUP_DIR}/schema.cql" 2>/dev/null || echo "Warning: Could not export schema"

# Tạo file tar.gz
echo "Creating compressed archive..."
cd "${SCRIPT_DIR}/backups"
if tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}/"; then
    echo "Removing uncompressed backup..."
    rm -rf "${SNAPSHOT_NAME}"
    BACKUP_FILE="${SNAPSHOT_NAME}.tar.gz"
else
    echo "Warning: Failed to create compressed archive. Backup will remain uncompressed."
    BACKUP_FILE="${SNAPSHOT_NAME}"
fi

# Xóa snapshot trong container để tiết kiệm dung lượng
echo "Cleaning up snapshot in container..."
docker exec "${CONTAINER_NAME}" nodetool clearsnapshot -t "${SNAPSHOT_NAME}"

echo "====================================="
echo "Backup completed successfully!"
echo "Backup location: ${SCRIPT_DIR}/backups/${BACKUP_FILE}"
echo "====================================="

# Hiển thị danh sách backup
echo "Current backups:"
ls -la "${SCRIPT_DIR}/backups"

echo ""
echo "Backup process completed. Press Enter to continue..."
read
