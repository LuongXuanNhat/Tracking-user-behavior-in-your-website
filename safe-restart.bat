@echo off
echo ====================================
echo SAFE CASSANDRA CLUSTER RESTART
echo ====================================

echo Stopping containers gracefully...
docker-compose stop cassandra-node3
timeout /t 10 /nobreak >nul

docker-compose stop cassandra-node2  
timeout /t 10 /nobreak >nul

docker-compose stop cassandra-node1
timeout /t 10 /nobreak >nul

echo.
echo Cleaning up volumes (optional - comment out if you want to keep data)
:: docker volume prune -f

echo.
echo Starting cluster with optimized settings...
docker-compose up -d cassandra-node1

echo Waiting for node1 to be healthy...
:WAIT_NODE1
docker ps --filter "name=cassandra_node1" --format "{{.Status}}" | findstr "healthy" >nul
if errorlevel 1 (
    echo Waiting for node1...
    timeout /t 10 /nobreak >nul
    goto WAIT_NODE1
)

echo Node1 is healthy! Starting node2...
docker-compose up -d cassandra-node2

echo Waiting 60 seconds before starting node3...
timeout /t 60 /nobreak >nul

echo Starting node3...
docker-compose up -d cassandra-node3

echo.
echo Starting other services...
docker-compose up -d cassandra-web haproxy

echo.
echo ====================================
echo Cluster restart completed!
echo Run monitor-cassandra.bat to monitor
echo ====================================
