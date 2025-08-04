#!/bin/bash

# Cassandra Database Restore Script for Linux/Mac
# Usage: ./restore_cassandra.sh [backup_name]

# Configuration
CONTAINER_NAME="cassandra_user_logs"
KEYSPACE="user_behavior_analytics"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"

if [ -z "$1" ]; then
    echo "Usage: $0 [backup_name]"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_DIR}" 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "====================================="
echo "Cassandra Database Restore Script"
echo "====================================="
echo "Container: ${CONTAINER_NAME}"
echo "Keyspace: ${KEYSPACE}"
echo "Backup: ${BACKUP_NAME}"
echo "====================================="

# Kiểm tra backup có tồn tại không
if [ ! -d "${BACKUP_PATH}" ] && [ ! -f "${BACKUP_PATH}.tar.gz" ]; then
    echo "ERROR: Backup ${BACKUP_NAME} not found!"
    echo "Available backups:"
    ls -1 "${BACKUP_DIR}" 2>/dev/null || echo "No backups found"
    exit 1
fi

# Giải nén backup nếu cần
if [ -f "${BACKUP_PATH}.tar.gz" ] && [ ! -d "${BACKUP_PATH}" ]; then
    echo "Extracting backup archive..."
    cd "${BACKUP_DIR}"
    tar -xzf "${BACKUP_NAME}.tar.gz"
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to extract backup archive!"
        exit 1
    fi
fi

# Kiểm tra container có đang chạy không
echo "Checking if Cassandra container is running..."
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "ERROR: Container ${CONTAINER_NAME} is not running!"
    echo "Please start the container using: docker-compose up -d cassandra"
    exit 1
fi

echo "WARNING: This will overwrite existing data in the keyspace!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Stopping Cassandra service..."
docker exec "${CONTAINER_NAME}" nodetool drain

echo "Copying backup data to container..."
docker cp "${BACKUP_PATH}" "${CONTAINER_NAME}:/tmp/restore_data"

echo "Restoring data..."
docker exec "${CONTAINER_NAME}" bash -c "cp -r /tmp/restore_data/* /var/lib/cassandra/data/ && chown -R cassandra:cassandra /var/lib/cassandra/data"

echo "Refreshing keyspace..."
docker exec "${CONTAINER_NAME}" nodetool refresh "${KEYSPACE}"

echo "Cleanup temporary files..."
docker exec "${CONTAINER_NAME}" rm -rf /tmp/restore_data

echo "====================================="
echo "Restore completed successfully!"
echo "====================================="
