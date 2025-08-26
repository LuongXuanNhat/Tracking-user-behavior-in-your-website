@echo off
echo ====================================
echo CASSANDRA CLUSTER MONITOR
echo ====================================

:MONITOR_LOOP
echo.
echo [%TIME%] Checking cluster status...

:: Check container status
docker ps --filter "name=cassandra_node" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo.
echo Memory usage:
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}" cassandra_node1 cassandra_node2 cassandra_node3 2>nul

echo.
echo Checking logs for errors...
docker logs cassandra_node1 --tail 5 2>&1 | findstr /i "error\|exception\|failed\|timeout" && echo "Node1 has errors!"
docker logs cassandra_node2 --tail 5 2>&1 | findstr /i "error\|exception\|failed\|timeout" && echo "Node2 has errors!"
docker logs cassandra_node3 --tail 5 2>&1 | findstr /i "error\|exception\|failed\|timeout" && echo "Node3 has errors!"

echo.
echo ====================================
echo Press Ctrl+C to stop monitoring
timeout /t 30 /nobreak >nul
goto MONITOR_LOOP
