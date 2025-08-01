# Refactored User Behavior Tracking API

## Overview

The API has been completely refactored to match the new Cassandra database schema and business workflows. All models, APIs, middleware, and routes have been updated to support the new architecture.

## Architecture Changes

### Database Schema

- **Cassandra**: Using new keyspace with optimized tables for analytics and user tracking
- **Models**: Customer, Website, ApiKey, Event, User - all redesigned for better performance
- **Partitioning**: Events partitioned by website_id and date for optimal query performance

### Authentication

- **JWT Tokens**: Customer authentication using JSON Web Tokens
- **API Keys**: Website-specific API keys for tracking endpoints
- **Middleware**: New authentication middleware for customer and API key validation

## New Business Workflows

### 1. Customer Management (`/api/customers`)

- **Registration**: Create customer accounts with business information
- **Login**: JWT-based authentication
- **Profile Management**: Update customer details and settings
- **Password Management**: Reset and change passwords
- **Subscription Management**: Handle plan upgrades and limits

### 2. Website Management (`/api/websites`)

- **CRUD Operations**: Create, read, update, delete websites
- **Customer Association**: Link websites to customer accounts
- **Tracking Configuration**: Set up tracking parameters and settings
- **Statistics**: Basic website metrics and information

### 3. Event Tracking (`/api/tracking`)

- **Event Collection**: Receive and store user behavior events
- **User Management**: Create and manage website visitors
- **Real-time Processing**: Handle high-volume event ingestion
- **Data Validation**: Ensure event data integrity

### 4. Analytics & Reporting (`/api/analytics`)

- **Overview Dashboard**: Key metrics and KPIs
- **Event Reports**: Detailed event analysis
- **User Journey**: Track user paths and behavior
- **Funnel Analysis**: Conversion funnel metrics
- **Time-based Reports**: Performance over time periods

### 5. API Key Management (`/api/api-keys`)

- **Key Generation**: Create API keys for websites
- **Permission Control**: Granular access control
- **Key Rotation**: Regenerate keys for security
- **Usage Monitoring**: Track API key usage

### 6. User Management (`/api/users`)

- **Visitor Profiles**: Manage website visitor data
- **CRUD Operations**: Create, read, update, delete user records
- **Data Privacy**: Handle user data with privacy considerations

## Technical Stack

### Backend

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Cassandra**: NoSQL database
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **uuid**: Unique identifier generation

### Middleware

- **authenticateCustomer**: JWT token validation for customers
- **CORS**: Cross-origin resource sharing
- **Body parsing**: JSON and URL-encoded data handling

### Models

- **Customer**: Business account management
- **Website**: Website configuration and tracking
- **ApiKey**: API key management and validation
- **Event**: User behavior event storage
- **User**: Website visitor management

## API Endpoints

### Customer Endpoints

```
POST   /api/customers/register      - Register new customer
POST   /api/customers/login         - Customer login
GET    /api/customers/profile       - Get customer profile
PUT    /api/customers/profile       - Update customer profile
POST   /api/customers/change-password - Change password
POST   /api/customers/forgot-password - Initiate password reset
POST   /api/customers/reset-password  - Complete password reset
GET    /api/customers/settings      - Get customer settings
PUT    /api/customers/settings      - Update customer settings
```

### Website Endpoints

```
GET    /api/websites               - List customer websites
POST   /api/websites               - Create new website
GET    /api/websites/:id           - Get website details
PUT    /api/websites/:id           - Update website
DELETE /api/websites/:id           - Delete website
```

### Tracking Endpoints

```
POST   /api/tracking/event         - Track user event
POST   /api/tracking/events        - Track multiple events
POST   /api/tracking/user          - Create/update user
GET    /api/tracking/user/:id      - Get user details
```

### Analytics Endpoints

```
GET    /api/analytics/overview     - Dashboard overview
GET    /api/analytics/events       - Event reports
GET    /api/analytics/users        - User analytics
GET    /api/analytics/journeys     - User journey analysis
GET    /api/analytics/funnels      - Funnel analysis
```

### API Key Endpoints

```
GET    /api/api-keys               - List customer API keys
POST   /api/api-keys               - Create new API key
PUT    /api/api-keys/:id           - Update API key
DELETE /api/api-keys/:id           - Delete API key
POST   /api/api-keys/:id/regenerate - Regenerate API key
```

### User Management Endpoints

```
GET    /api/users                  - List users (paginated)
GET    /api/users/:id              - Get user details
PUT    /api/users/:id              - Update user
DELETE /api/users/:id              - Delete user
```

## Security Features

### Authentication

- **JWT Tokens**: Secure customer session management
- **API Keys**: Website-specific access control
- **Password Hashing**: bcrypt for secure password storage

### Authorization

- **Customer-scoped Access**: Customers can only access their own data
- **API Key Permissions**: Granular permission control for different operations
- **Plan-based Limits**: Subscription plan enforcement

### Data Protection

- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Protection against abuse (configurable)

## Performance Optimizations

### Database Design

- **Partitioned Tables**: Events partitioned by website and date
- **Efficient Queries**: Optimized for common access patterns
- **Indexing**: Strategic indexes for fast lookups

### Caching

- **API Key Caching**: In-memory cache for API key validation
- **Connection Pooling**: Efficient database connection management

## Error Handling

### Standardized Responses

```json
{
  "status": "success|error",
  "message": "Human-readable message",
  "data": {},
  "errors": []
}
```

### Error Types

- **Validation Errors**: Input validation failures
- **Authentication Errors**: Invalid credentials or tokens
- **Authorization Errors**: Insufficient permissions
- **Not Found Errors**: Resource not found
- **Server Errors**: Internal server errors

## Testing

### Test Coverage

- **Unit Tests**: Individual model and API tests
- **Integration Tests**: Full workflow testing
- **Load Tests**: Performance under load

### Test Files

- `test-refactor.js`: Comprehensive API endpoint testing
- `api.test.js`: Existing API tests (updated)
- `demo.test.js`: Demo and example tests

## Deployment

### Environment Variables

```
CASSANDRA_HOSTS=localhost
CASSANDRA_KEYSPACE=user_tracking
JWT_SECRET=your-secret-key
PORT=3002
```

### Database Setup

1. Run `cassandra/setup-database.cql` to create tables
2. Configure connection in `backend/config/database/init.js`
3. Models will auto-initialize tables on startup

### Starting the Server

```bash
node server.js
```

## Migration Notes

### Breaking Changes

- **API Endpoints**: All endpoints have been restructured
- **Authentication**: New JWT-based customer authentication
- **Data Models**: Complete model redesign for Cassandra
- **Database Schema**: New Cassandra schema replaces old structure

### Migration Steps

1. **Database**: Create new Cassandra keyspace and tables
2. **Code Update**: All models, APIs, and routes have been replaced
3. **Configuration**: Update environment variables
4. **Testing**: Run comprehensive tests to verify functionality

## Future Enhancements

### Planned Features

- **Real-time Analytics**: WebSocket-based live data
- **Advanced Segmentation**: User behavior segmentation
- **A/B Testing**: Built-in A/B testing framework
- **Data Export**: Export analytics data in various formats
- **Webhooks**: Event-driven notifications

### Performance Improvements

- **Redis Caching**: Additional caching layer
- **Database Sharding**: Scale across multiple Cassandra nodes
- **CDN Integration**: Static asset optimization
- **API Rate Limiting**: Advanced rate limiting strategies
