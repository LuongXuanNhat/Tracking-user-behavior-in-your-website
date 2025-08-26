cassandra_node1#!/bin/bash

# ===================================
# Cassandra Database Backup Script with Data Export
# ===================================

# Configuration
CONTAINER_NAME="cassandra_node1"
KEYSPACE="user_behavior_analytics"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="data_backup_${TIMESTAMP}"

# Define backup paths
BACKUPS_ROOT="${SCRIPT_DIR}/backups"
BACKUP_DIR="${BACKUPS_ROOT}/${SNAPSHOT_NAME}"
DATA_DIR="${BACKUP_DIR}/data"
SCHEMA_DIR="${BACKUP_DIR}/schema"

echo "====================================="
echo "Cassandra Database Backup Script with Data"
echo "====================================="
echo "Container: ${CONTAINER_NAME}"
echo "Keyspace: ${KEYSPACE}"
echo "Backup Directory: ${BACKUP_DIR}"
echo "Snapshot Name: ${SNAPSHOT_NAME}"
echo "====================================="

# Create backup directories
mkdir -p "${BACKUPS_ROOT}"
mkdir -p "${BACKUP_DIR}"
mkdir -p "${DATA_DIR}"
mkdir -p "${SCHEMA_DIR}"

# Check if container is running
echo "Checking if Cassandra container is running..."
if ! docker ps --format "table {{.Names}}" | grep -q "${CONTAINER_NAME}"; then
    echo "ERROR: Container ${CONTAINER_NAME} is not running!"
    echo "Please start the container using: docker-compose up -d cassandra"
    exit 1
fi

# Create snapshot for structure backup
echo "Creating snapshot: ${SNAPSHOT_NAME}"
if ! docker exec "${CONTAINER_NAME}" nodetool snapshot -t "${SNAPSHOT_NAME}" "${KEYSPACE}"; then
    echo "ERROR: Failed to create snapshot!"
    exit 1
fi

# Export database schema
echo "Exporting database schema..."
if ! docker exec "${CONTAINER_NAME}" cqlsh -e "DESCRIBE KEYSPACE ${KEYSPACE};" > "${SCHEMA_DIR}/keyspace_schema.cql" 2>/dev/null; then
    echo "Warning: Could not export keyspace schema using cqlsh"
    # Fallback: copy schema file from project
    if [ -f "${SCRIPT_DIR}/../cassandra/database.cql" ]; then
        cp "${SCRIPT_DIR}/../cassandra/database.cql" "${SCHEMA_DIR}/database_schema.cql"
        echo "Copied database schema from project files"
    fi
fi

# Export individual table schemas
echo "Exporting individual table schemas..."
TABLES=("customers" "websites" "events" "events_by_user" "events_by_type" "events_by_session" "api_key_websites")

for table in "${TABLES[@]}"; do
    echo "  Exporting schema for table: ${table}"
    if ! docker exec "${CONTAINER_NAME}" cqlsh -e "DESCRIBE TABLE ${KEYSPACE}.${table};" > "${SCHEMA_DIR}/table_${table}_schema.cql" 2>/dev/null; then
        echo "    Warning: Could not export schema for table ${table}"
    fi
done

# =====================================
# EXPORT DATA FROM ALL TABLES
# =====================================

echo "====================================="
echo "Exporting data from all tables..."
echo "====================================="

# Function to export table data with error handling
for table in "${TABLES[@]}"; do
    echo ""
    echo "Exporting data from table: ${table}"
    echo "  Please wait, this may take a while for large tables..."
    
    # Export data as CSV
    if docker exec "${CONTAINER_NAME}" cqlsh -e "COPY ${KEYSPACE}.${table} TO '/tmp/${table}_data.csv' WITH HEADER=true;" 2>/dev/null; then
        # Copy CSV file from container to host
        if docker cp "${CONTAINER_NAME}:/tmp/${table}_data.csv" "${DATA_DIR}/${table}_data.csv" 2>/dev/null; then
            echo "  ✓ Data exported successfully for table ${table}"
            # Cleanup temp file in container
            docker exec "${CONTAINER_NAME}" rm -f "/tmp/${table}_data.csv" 2>/dev/null
        else
            echo "  ✗ Failed to copy data file for table ${table}"
        fi
    else
        echo "  ✗ Failed to export data for table ${table} - table may be empty or inaccessible"
    fi
    
    # Alternative method: export as SELECT results
    echo "  Creating SELECT results for table: ${table}"
    if docker exec "${CONTAINER_NAME}" cqlsh -e "SELECT * FROM ${KEYSPACE}.${table};" > "${DATA_DIR}/${table}_select_results.txt" 2>/dev/null; then
        echo "  ✓ SELECT results exported for table ${table}"
    else
        echo "  ✗ Failed to export SELECT results for table ${table}"
    fi
done

# =====================================
# EXPORT ADDITIONAL METADATA
# =====================================

echo ""
echo "Exporting additional metadata..."

# Export keyspace info
docker exec "${CONTAINER_NAME}" cqlsh -e "SELECT * FROM system_schema.keyspaces WHERE keyspace_name='${KEYSPACE}';" > "${SCHEMA_DIR}/keyspace_info.txt" 2>/dev/null

# Export table info
docker exec "${CONTAINER_NAME}" cqlsh -e "SELECT * FROM system_schema.tables WHERE keyspace_name='${KEYSPACE}';" > "${SCHEMA_DIR}/tables_info.txt" 2>/dev/null

# Export columns info
docker exec "${CONTAINER_NAME}" cqlsh -e "SELECT * FROM system_schema.columns WHERE keyspace_name='${KEYSPACE}';" > "${SCHEMA_DIR}/columns_info.txt" 2>/dev/null

# Export indexes info
docker exec "${CONTAINER_NAME}" cqlsh -e "SELECT * FROM system_schema.indexes WHERE keyspace_name='${KEYSPACE}';" > "${SCHEMA_DIR}/indexes_info.txt" 2>/dev/null

# Copy snapshot data (structure backup)
echo ""
echo "Copying snapshot data (structure backup)..."
TEMP_DIR="${BACKUP_DIR}/temp_snapshot"
mkdir -p "${TEMP_DIR}"

# Find and copy snapshot directories
SNAPSHOT_PATHS=$(docker exec "${CONTAINER_NAME}" find /var/lib/cassandra/data/${KEYSPACE} -name "*${SNAPSHOT_NAME}*" -type d 2>/dev/null)

if [ -n "${SNAPSHOT_PATHS}" ]; then
    echo "${SNAPSHOT_PATHS}" | while read -r path; do
        echo "Copying snapshot from: ${path}"
        if ! docker cp "${CONTAINER_NAME}:${path}" "${TEMP_DIR}/" 2>/dev/null; then
            echo "WARNING: Failed to copy some snapshot data from ${path}"
        fi
    done
    echo "✓ Snapshot data copied successfully"
else
    echo "Warning: No snapshot data found"
    rmdir "${TEMP_DIR}" 2>/dev/null
fi

# =====================================
# CREATE RESTORE SCRIPTS
# =====================================

echo ""
echo "Creating restore scripts..."

# Create Linux restore script
cat > "${BACKUP_DIR}/run_restore_data.sh" << 'EOF'
#!/bin/bash
# Auto-generated restore script for Linux
# Usage: ./run_restore_data.sh [container_name] [keyspace_name]

CONTAINER_NAME=${1:-"cassandra_node1"}
KEYSPACE=${2:-"user_behavior_analytics"}

echo "Restoring data to container: $CONTAINER_NAME, keyspace: $KEYSPACE"

# Copy schema files to container
docker cp schema/keyspace_schema.cql $CONTAINER_NAME:/tmp/

# First create keyspace and tables
docker exec $CONTAINER_NAME cqlsh -f /tmp/keyspace_schema.cql

# Restore data for each table
TABLES=("customers" "websites" "events" "events_by_user" "events_by_type" "events_by_session" "api_key_websites")

for table in "${TABLES[@]}"; do
    if [ -f "data/${table}_data.csv" ]; then
        echo "Restoring data for table: ${table}"
        docker cp "data/${table}_data.csv" $CONTAINER_NAME:/tmp/
        docker exec $CONTAINER_NAME cqlsh -e "COPY $KEYSPACE.${table} FROM '/tmp/${table}_data.csv' WITH HEADER=true;"
        docker exec $CONTAINER_NAME rm -f "/tmp/${table}_data.csv"
    else
        echo "Warning: Data file for table ${table} not found"
    fi
done

echo "Data restore completed!"
EOF

chmod +x "${BACKUP_DIR}/run_restore_data.sh"

# Create Windows restore script
cat > "${BACKUP_DIR}/run_restore_data.bat" << 'EOF'
@echo off
REM Auto-generated restore script for Windows
REM Usage: run_restore_data.bat [container_name] [keyspace_name]

set "CONTAINER_NAME=%1"
set "KEYSPACE=%2"
if "%CONTAINER_NAME%"=="" set "CONTAINER_NAME=cassandra_node1"
if "%KEYSPACE%"=="" set "KEYSPACE=user_behavior_analytics"

echo Restoring data to container: %CONTAINER_NAME%, keyspace: %KEYSPACE%

REM Copy schema files to container
docker cp schema\keyspace_schema.cql %CONTAINER_NAME%:/tmp/

REM First create keyspace and tables
docker exec %CONTAINER_NAME% cqlsh -f /tmp/keyspace_schema.cql

REM Restore data for each table
set "TABLES=customers websites events events_by_user events_by_type events_by_session api_key_websites"

for %%t in (%TABLES%) do (
    echo Restoring data for table: %%t
    if exist "data\%%t_data.csv" (
        docker cp "data\%%t_data.csv" %CONTAINER_NAME%:/tmp/
        docker exec %CONTAINER_NAME% cqlsh -e "COPY %KEYSPACE%.%%t FROM '/tmp/%%t_data.csv' WITH HEADER=true;"
        docker exec %CONTAINER_NAME% rm -f "/tmp/%%t_data.csv"
    ) else (
        echo Warning: Data file for table %%t not found
    )
)

echo Data restore completed!
pause
EOF

# Create comprehensive backup metadata
echo ""
echo "Creating comprehensive backup metadata..."
cat > "${BACKUP_DIR}/backup_info.txt" << EOF
Cassandra Database Backup with Data
====================================
Date: $(date)
Container: ${CONTAINER_NAME}
Keyspace: ${KEYSPACE}
Snapshot Name: ${SNAPSHOT_NAME}
Script Location: ${SCRIPT_DIR}

Backup Contents:
================
- Schema backup: schema/ directory
- Data backup: data/ directory  
- Snapshot backup: temp_snapshot/ directory (if available)
- Restore scripts: run_restore_data.bat & run_restore_data.sh

Tables backed up:
$(printf '%s\n' "${TABLES[@]}" | sed 's/^/- /')

File Structure:
===============
$(find "${BACKUP_DIR}" -type f | sort)

Docker Info:
$(docker version --format "Client: {{.Client.Version}} - Server: {{.Server.Version}}" 2>/dev/null)

Cassandra Info:
$(docker exec "${CONTAINER_NAME}" nodetool version 2>/dev/null)

System Info:
$(uname -a)
EOF

# Cleanup snapshot in container
echo ""
echo "Cleaning up snapshot in container..."
docker exec "${CONTAINER_NAME}" nodetool clearsnapshot -t "${SNAPSHOT_NAME}" 2>/dev/null

# Create compressed archive
echo ""
echo "Creating compressed archive..."
cd "${BACKUPS_ROOT}"

if command -v tar >/dev/null 2>&1; then
    echo "Using tar to compress..."
    if tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"; then
        echo "Removing uncompressed backup..."
        rm -rf "${SNAPSHOT_NAME}"
        BACKUP_FILE="${SNAPSHOT_NAME}.tar.gz"
    else
        echo "Warning: Failed to compress with tar"
        BACKUP_FILE="${SNAPSHOT_NAME}"
    fi
else
    echo "Warning: tar not found. Backup will remain uncompressed."
    BACKUP_FILE="${SNAPSHOT_NAME}"
fi

echo "====================================="
echo "Data backup completed successfully!"
echo "====================================="
echo "Backup location: ${BACKUPS_ROOT}/${BACKUP_FILE}"
echo ""
echo "Backup includes:"
echo "✓ Database schema (structure)"
echo "✓ All table data (CSV format)"
echo "✓ Snapshot backup (if available)"
echo "✓ Restore scripts (Windows & Linux)"
echo "✓ Comprehensive metadata"
echo "====================================="

# Display backup information
echo ""
echo "Backup size:"
if [ -f "${BACKUPS_ROOT}/${BACKUP_FILE}" ]; then
    ls -lh "${BACKUPS_ROOT}/${BACKUP_FILE}" | awk '{print "  " $5}'
fi

echo ""
echo "Current backups:"
ls -1 "${BACKUPS_ROOT}" 2>/dev/null

echo ""
echo "====================================="
echo "Backup process completed successfully!"
echo ""
echo "To restore this backup:"
echo "1. Extract the backup file"
echo "2. Run run_restore_data.sh (Linux) or run_restore_data.bat (Windows)"
echo "3. Provide container name and keyspace name if different"
echo "====================================="
