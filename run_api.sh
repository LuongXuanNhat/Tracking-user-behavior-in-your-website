#!/bin/bash

# =======================================================
# 🚀 AUTO CHECK & RUN USER BEHAVIOR TRACKING API
# =======================================================

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Function to kill process on port 3001
kill_port_3001() {
    print_warning "Killing existing process on port 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 2
}

# Function to test API endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    print_status "Testing: $description"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/api_response "$url" 2>/dev/null)
    http_code=${response: -3}
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "✅ $description - Status: $http_code"
        if [ -f /tmp/api_response ]; then
            echo "   Response: $(head -c 100 /tmp/api_response)..."
        fi
        return 0
    else
        print_error "❌ $description - Expected: $expected_status, Got: $http_code"
        if [ -f /tmp/api_response ]; then
            echo "   Response: $(cat /tmp/api_response)"
        fi
        return 1
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local url=$1
    local data=$2
    local expected_status=$3
    local description=$4
    
    print_status "Testing: $description"
    
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        -o /tmp/api_response "$url" 2>/dev/null)
    http_code=${response: -3}
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "✅ $description - Status: $http_code"
        if [ -f /tmp/api_response ]; then
            echo "   Response: $(head -c 150 /tmp/api_response)..."
        fi
        return 0
    else
        print_error "❌ $description - Expected: $expected_status, Got: $http_code"
        if [ -f /tmp/api_response ]; then
            echo "   Response: $(cat /tmp/api_response)"
        fi
        return 1
    fi
}

# =======================================================
# MAIN EXECUTION
# =======================================================

echo "================================================================"
echo "🚀 USER BEHAVIOR TRACKING API - AUTO CHECK & RUN"
echo "================================================================"

# Check system requirements
print_status "Checking system requirements..."

if ! command_exists node; then
    print_error "Node.js is not installed!"
    print_error "Please install Node.js v18+ from: https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed!"
    print_error "Please install npm (usually comes with Node.js)"
    exit 1
fi

if ! command_exists curl; then
    print_error "curl is not installed!"
    print_error "Please install curl for API testing"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_warning "Node.js version is $NODE_VERSION, recommended v18+"
fi

print_success "✅ System requirements check passed"
print_success "   Node.js: $(node --version)"
print_success "   npm: $(npm --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    print_error "Please run this script from the project root directory"
    exit 1
fi

if [ ! -f "server.js" ]; then
    print_error "server.js not found!"
    print_error "Please ensure server.js exists in the current directory"
    exit 1
fi

print_success "✅ Project structure check passed"

# Check package.json content
if ! grep -q '"express"' package.json; then
    print_error "Express dependency not found in package.json!"
    print_error "Please ensure Express is listed in dependencies"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies!"
        exit 1
    fi
    print_success "✅ Dependencies installed successfully"
else
    print_success "✅ Dependencies already installed"
fi

# Check port availability
if ! check_port; then
    print_warning "Port 3001 is already in use"
    read -p "Kill existing process and continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port_3001
    else
        print_error "Cannot start server on port 3001"
        exit 1
    fi
fi

# Start the server
print_status "Starting API server..."
npm start &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to start..."
sleep 5

# Check if server is running
if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Failed to start server!"
    print_error "Check the error messages above"
    exit 1
fi

print_success "✅ Server started with PID: $SERVER_PID"

# Wait a bit more for server to be ready
sleep 3

# Test API endpoints
echo ""
echo "================================================================"
echo "🧪 TESTING API ENDPOINTS"
echo "================================================================"

failed_tests=0

# Test 1: Main endpoint
if ! test_endpoint "http://localhost:3001/" "200" "Main API endpoint"; then
    ((failed_tests++))
fi

# Test 2: Health check
if ! test_endpoint "http://localhost:3001/health" "200" "Health check endpoint"; then
    ((failed_tests++))
fi

# Test 3: Users endpoint
if ! test_endpoint "http://localhost:3001/api/users" "200" "Users API endpoint"; then
    ((failed_tests++))
fi

# Test 4: Create user
user_data='{"name":"Test User","email":"test@example.com"}'
if ! test_post_endpoint "http://localhost:3001/api/users" "$user_data" "201" "Create new user"; then
    ((failed_tests++))
fi

# Test 5: Track event
event_data='{"user_id":"test_user_123","event_type":"click","element_type":"image","page_url":"https://example.com/test","element_id":"test-image"}'
if ! test_post_endpoint "http://localhost:3001/api/tracking/event" "$event_data" "201" "Track user event"; then
    ((failed_tests++))
fi

# Test 6: Analytics endpoints
if ! test_endpoint "http://localhost:3001/api/analytics/clicks" "200" "Click analytics"; then
    ((failed_tests++))
fi

if ! test_endpoint "http://localhost:3001/api/analytics/popular-services" "200" "Popular services analytics"; then
    ((failed_tests++))
fi

# Clean up temp file
rm -f /tmp/api_response

# Final results
echo ""
echo "================================================================"
echo "📊 TEST RESULTS"
echo "================================================================"

total_tests=7
passed_tests=$((total_tests - failed_tests))

if [ $failed_tests -eq 0 ]; then
    print_success "🎉 ALL TESTS PASSED! ($passed_tests/$total_tests)"
    print_success "✅ API is working perfectly!"
    print_success "🌐 Server running at: http://localhost:3001"
    print_success "📖 Demo page: frontend/demo.html"
    echo ""
    print_status "Press Ctrl+C to stop the server"
    
    # Keep server running
    wait $SERVER_PID
else
    print_error "❌ $failed_tests/$total_tests tests failed"
    print_error "Please check the errors above and fix them"
    
    # Kill server
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
