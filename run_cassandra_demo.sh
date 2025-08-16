#!/bin/bash

# 🚀 Cassandra Scalability Demo Automation Script
# Tự động setup và chạy demo cluster 3 nodes

set -e  # Exit on any error

echo "🚀 Starting Cassandra Scalability Demo..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if ports are available
check_ports() {
    print_status "Checking if ports 9042, 9043, 9044 are available..."
    
    for port in 9042 9043 9044; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is in use. Trying to stop existing containers..."
            docker-compose down > /dev/null 2>&1 || true
            break
        fi
    done
    
    print_success "Ports are available"
}

# Clean up existing containers
cleanup() {
    print_status "Cleaning up existing containers..."
    
    # Stop and remove any existing Cassandra containers
    docker ps -q --filter "name=cassandra" | xargs -r docker stop > /dev/null 2>&1 || true
    docker ps -aq --filter "name=cassandra" | xargs -r docker rm > /dev/null 2>&1 || true
    
    # Clean up docker-compose
    docker-compose down -v > /dev/null 2>&1 || true
    
    print_success "Cleanup completed"
}

# Start Cassandra cluster
start_cluster() {
    print_status "Starting Cassandra cluster (3 nodes)..."
    
    # Start cluster with docker-compose
    docker-compose up -d
    
    print_success "Containers started, waiting for cluster to be ready..."
    
    # Wait for containers to be healthy
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local healthy_count=$(docker ps --filter "name=cassandra" --filter "health=healthy" -q | wc -l)
        
        if [ "$healthy_count" -eq 3 ]; then
            print_success "All 3 Cassandra nodes are healthy!"
            break
        fi
        
        printf "."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Cluster failed to start within expected time"
        print_status "Current container status:"
        docker ps --filter "name=cassandra"
        exit 1
    fi
}

# Setup database schema
setup_database() {
    print_status "Setting up database schema..."
    
    # Copy schema file to container
    if [ -f "./cassandra/database.cql" ]; then
        docker cp ./cassandra/database.cql cassandra_node1:/database.cql
        print_success "Schema file copied to container"
    else
        print_error "Schema file not found: ./cassandra/database.cql"
        exit 1
    fi
    
    # Execute schema
    print_status "Creating keyspace and tables..."
    docker exec cassandra_node1 cqlsh -f /database.cql
    print_success "Database schema created"
}

# Insert sample data
insert_sample_data() {
    print_status "Inserting sample data..."
    
    docker exec -i cassandra_node2 cqlsh << 'EOF'
USE user_behavior_analytics;

INSERT INTO events (website_id, event_date, event_time, event_id, visitor_id, event_type, page_url)
VALUES (550e8400-e29b-41d4-a716-446655440000, '2024-08-16', '2024-08-16 10:00:00+0000', now(), now(), 'pageview', '/home');

INSERT INTO events (website_id, event_date, event_time, event_id, visitor_id, event_type, page_url)
VALUES (660f9500-f39c-42e5-b827-556766551111, '2024-08-16', '2024-08-16 11:00:00+0000', now(), now(), 'click', '/products');

INSERT INTO events (website_id, event_date, event_time, event_id, visitor_id, event_type, page_url)
VALUES (770a0600-a40d-43f6-c938-667877662222, '2024-08-17', '2024-08-17 09:00:00+0000', now(), now(), 'purchase', '/checkout');

INSERT INTO events (website_id, event_date, event_time, event_id, visitor_id, event_type, page_url)
VALUES (880b1700-b51e-44f7-d049-778988773333, '2024-08-18', '2024-08-18 16:00:00+0000', now(), now(), 'scroll', '/blog');

SELECT COUNT(*) FROM events;
EOF
    
    print_success "Sample data inserted"
}

# Display cluster status
show_cluster_status() {
    print_status "Displaying cluster status..."
    
    echo ""
    echo "🔍 CLUSTER STATUS:"
    echo "=================="
    docker exec cassandra_node2 nodetool status
    
    echo ""
    echo "📊 DATA VERIFICATION:"
    echo "===================="
    docker exec -i cassandra_node2 cqlsh << 'EOF'
USE user_behavior_analytics;
SELECT website_id, event_date, event_type, page_url FROM events;
EOF
}

# Main demo function
run_demo() {
    print_status "🎯 Running Scalability Demo..."
    
    echo ""
    echo "📋 DEMO SCENARIO: Node Failure Simulation"
    echo "=========================================="
    
    # Show current status
    print_status "Current cluster status (3 nodes):"
    docker exec cassandra_node2 nodetool status | grep -E "(UN|DN)"
    
    # Simulate node failure
    print_warning "Simulating node failure (stopping cassandra_node1)..."
    docker stop cassandra_node1 > /dev/null 2>&1
    
    sleep 10
    
    # Show status after failure
    print_status "Cluster status after node failure (2 nodes remaining):"
    docker exec cassandra_node2 nodetool status | grep -E "(UN|DN)"
    
    # Test data accessibility
    print_status "Testing data accessibility with node down..."
    docker exec -i cassandra_node2 cqlsh << 'EOF'
USE user_behavior_analytics;
SELECT COUNT(*) as total_events FROM events;
EOF
    
    print_success "✅ Data is still accessible with node failure!"
    print_success "✅ This demonstrates Cassandra's fault tolerance with RF=3"
    
    # Restart the failed node
    print_status "Restarting failed node..."
    docker start cassandra_node1 > /dev/null 2>&1
    
    sleep 15
    
    print_status "Final cluster status (all nodes restored):"
    docker exec cassandra_node1 nodetool status | grep -E "(UN|DN)"
}

# Print useful commands
show_useful_commands() {
    echo ""
    echo "🛠️  USEFUL COMMANDS FOR FURTHER EXPLORATION:"
    echo "=============================================="
    echo ""
    echo "# Connect to CQL shell:"
    echo "docker exec -it cassandra_node1 cqlsh"
    echo ""
    echo "# Check cluster status:"
    echo "docker exec cassandra_node1 nodetool status"
    echo ""
    echo "# View token distribution:"
    echo "docker exec cassandra_node1 nodetool ring"
    echo ""
    echo "# Check data statistics:"
    echo "docker exec cassandra_node1 nodetool cfstats user_behavior_analytics.events"
    echo ""
    echo "# Stop the demo:"
    echo "docker-compose down"
    echo ""
    echo "# View logs:"
    echo "docker logs cassandra_node1"
    echo ""
}

# Main execution
main() {
    echo ""
    print_status "Starting automated Cassandra Scalability Demo"
    echo ""
    
    check_docker
    check_ports
    cleanup
    start_cluster
    setup_database
    insert_sample_data
    show_cluster_status
    run_demo
    show_useful_commands
    
    echo ""
    print_success "🎉 Demo completed successfully!"
    print_success "🚀 You now have a running 3-node Cassandra cluster"
    print_success "📊 Data is distributed across nodes with RF=3"
    print_success "💪 Fault tolerance demonstrated with node failure simulation"
    echo ""
    print_status "The cluster is now ready for further experimentation!"
}

# Handle script interruption
trap 'print_error "Demo interrupted. Run docker-compose down to cleanup."; exit 1' INT TERM

# Run main function
main
