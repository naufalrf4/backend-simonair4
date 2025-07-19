# Implementation Plan

(Note: Execute sequentially; test at end.)

- [x] **1. Entity and Database Setup** (Requirements: 1.1, 5.1)
  - [x] Create `manual-measurement.entity.ts` with proper indexes and relations
  - [x] Create database migration for `manual_measurements` table
  - [x] Update `Device` entity to include `manual_measurements` relation
  - [x] Update `User` entity to include `manual_measurements` relation
  - [x] Test database schema and relations

- [x] **2. DTOs and Validation** (Requirements: 1.1, 4.1)
  - [x] Create `create-manual-measurement.dto.ts` with comprehensive validation
  - [x] Create `manual-measurement-query.dto.ts` for filtering and pagination
  - [x] Create `manual-measurement-response.dto.ts` for API responses
  - [x] Create `measurement-comparison-response.dto.ts` for comparison results
  - [x] Create custom validators for sensor value ranges
  - [x] Create validation test suite

- [x] **3. Custom Exceptions and Error Handling** (Requirements: 4.1, 4.2)
  - [x] Create `manual-measurement.exceptions.ts` with domain-specific exceptions
  - [x] Implement structured error responses with correlation IDs
  - [x] Add error logging and monitoring capabilities
  - [x] Create error handling middleware for manual measurements
  - [x] Test error scenarios and responses

- [x] **4. Repository Layer Implementation** (Requirements: 2.1, 2.2)
  - [x] Create `manual-measurements.repository.ts` with CRUD operations
  - [x] Add `findByDeviceId` method with pagination support
  - [x] Add `findByDateRange` method for time-based queries
  - [x] Add `findByTimestamp` method for duplicate checking
  - [x] Add `findWithPagination` method for efficient querying
  - [x] Add `checkDuplicates` method for validation
  - [x] Implement database query optimization
  - [x] Create comprehensive test suite for repository layer

- [x] **5. Measurement Comparison Service** (Requirements: 3.1, 3.2, 3.3)
  - [x] Create `measurement-comparison.service.ts` with comparison logic
  - [x] Implement `findClosestSensorData` method with time window search
  - [x] Implement `calculateDifferences` method for value comparison
  - [x] Implement `assessAccuracy` method for accuracy evaluation
  - [x] Implement `generateComparisonReport` method for analytics
  - [x] Add caching for comparison results
  - [x] Add comprehensive error handling for comparison failures
  - [x] Create `comparison-cache.service.ts` for in-memory caching
  - [x] Create comprehensive test suite for comparison service

- [x] **6. Core Service Layer** (Requirements: 1.1, 1.2, 2.1, 3.1)
  - [x] Create `manual-measurements.service.ts` with business logic
  - [x] Implement `create` method with validation and comparison
  - [x] Implement `findAll` method with pagination and filtering
  - [x] Implement `findOne` method with access control
  - [x] Implement `compareWithSensorData` method for on-demand comparison
  - [x] Implement `validateMeasurementValues` method for business validation
  - [x] Implement `checkForDuplicates` method for duplicate detection
  - [x] Add comprehensive error handling and logging
  - [x] Add device access validation
  - [x] Add business rules for sensor value ranges
  - [x] Create comprehensive test suite for service layer
  - [x] Integrate repository and comparison services
  - [x] Add caching support and performance optimizations

- [x] **7. Controller Implementation** (Requirements: 1.1, 1.2, 2.1, 3.1, 5.1)
  - [x] Create `manual-measurements.controller.ts` with RESTful endpoints
  - [x] Implement `POST /` endpoint for creating measurements
  - [x] Implement `GET /` endpoint for retrieving measurements
  - [x] Implement `GET /:id` endpoint for single measurement
  - [x] Implement `POST /:id/compare` endpoint for comparison
  - [x] Implement `GET /:id/statistics` endpoint for statistics
  - [x] Add comprehensive Swagger documentation
  - [x] Add proper HTTP status codes and error responses
  - [x] Add validation pipes and guards
  - [x] Integrate with service layer and comparison service

- [ ] **8. Caching and Performance Optimization** (Requirements: 3.1, 3.2)
  - [ ] Create `comparison-cache.service.ts` for caching comparison results
  - [ ] Implement Redis caching for frequently accessed comparisons
  - [ ] Add cache invalidation strategies for data updates
  - [ ] Implement optimized database queries with proper joins
  - [ ] Add pagination optimization for large datasets
  - [ ] Implement concurrent access handling
  - [ ] Add query result caching for sensor data lookups

- [ ] **9. Integration with Existing Modules** (Requirements: 5.1, 5.2, 5.3)
  - [ ] Update `devices.module.ts` to include manual measurements relations
  - [ ] Update `users.module.ts` to include manual measurements relations
  - [ ] Create `manual-measurements.module.ts` with proper dependencies
  - [ ] Add integration with `sensors.module.ts` for comparison data
  - [ ] Add integration with `events.module.ts` for real-time updates
  - [ ] Add integration with `auth.module.ts` for access control
  - [ ] Configure proper module imports and exports

- [ ] **10. Real-time Events Integration** (Requirements: 5.4, 5.5)
  - [ ] Create `manual-measurement-event.service.ts` for WebSocket events
  - [ ] Implement event emission for measurement creation
  - [ ] Implement event emission for comparison results
  - [ ] Add event filtering by device and user access
  - [ ] Add event logging and monitoring
  - [ ] Implement connection management for WebSocket events
  - [ ] Add event retry mechanisms for failed deliveries

- [ ] **11. Export and Reporting Features** (Requirements: 2.2, 3.3)
  - [ ] Create export functionality for manual measurements
  - [ ] Implement CSV export with manual and sensor data comparison
  - [ ] Implement Excel export with multiple sheets and formatting
  - [ ] Add export filtering by date range and measurement type
  - [ ] Add comparison report generation with statistical analysis
  - [ ] Implement export progress tracking for large datasets
  - [ ] Add export caching for frequently requested data

- [ ] **12. Data Validation and Quality Control** (Requirements: 4.1, 4.2, 4.3)
  - [ ] Create comprehensive validation rules for sensor values
  - [ ] Implement biological and technical range validation
  - [ ] Add validation warnings for values significantly different from recent sensor readings
  - [ ] Implement duplicate prevention and handling
  - [ ] Add data quality metrics and monitoring
  - [ ] Create validation reports and recommendations
  - [ ] Implement automated data quality checks

- [ ] **13. Security and Access Control** (Requirements: 5.1, 5.2, 5.6)
  - [ ] Implement device ownership validation for all operations
  - [ ] Add user authentication and authorization checks
  - [ ] Implement rate limiting for API endpoints
  - [ ] Add input sanitization and validation
  - [ ] Implement audit logging for all manual measurement operations
  - [ ] Add CSRF protection for state-changing operations
  - [ ] Implement proper error message sanitization

- [ ] **14. API Documentation and Swagger** (Requirements: 1.1, 1.2, 2.1)
  - [ ] Add comprehensive Swagger decorators to all endpoints
  - [ ] Document all request/response schemas with examples
  - [ ] Add proper error response documentation
  - [ ] Document authentication and authorization requirements
  - [ ] Add API usage examples and best practices
  - [ ] Document rate limiting and performance considerations
  - [ ] Add comparison feature documentation with examples
  - [ ] Implement interactive API documentation with Swagger UI

- [ ] **15. Unit Testing Implementation** (Requirements: 1.1, 1.2, 2.1, 3.1)
  - [ ] Create `manual-measurements.service.spec.ts` with comprehensive service tests
  - [ ] Create `measurement-comparison.service.spec.ts` with comparison logic tests
  - [ ] Create `manual-measurements.repository.spec.ts` with repository method tests
  - [ ] Add tests for all custom exceptions and error handling
  - [ ] Add tests for validation logic and edge cases
  - [ ] Add tests for caching and performance optimizations
  - [ ] Add tests for sensor data integration
  - [ ] Achieve minimum 90% code coverage for all service methods

- [ ] **16. Integration Testing Implementation** (Requirements: 1.1, 1.2, 2.1, 3.1, 5.1)
  - [ ] Create `manual-measurements.controller.spec.ts` with API endpoint tests
  - [ ] Add database integration tests for repository methods
  - [ ] Add authentication and authorization integration tests
  - [ ] Add device access validation integration tests
  - [ ] Add sensor data comparison integration tests
  - [ ] Add real-time events integration tests
  - [ ] Add export functionality integration tests
  - [ ] Add performance benchmarking tests for critical operations

- [ ] **17. End-to-End Testing Implementation** (Requirements: 1.1, 1.2, 2.1, 3.1, 5.1)
  - [ ] Create `manual-measurements.e2e-spec.ts` with complete workflow tests
  - [ ] Add full manual measurement creation and retrieval workflow
  - [ ] Add sensor data comparison workflow tests
  - [ ] Add export and reporting workflow tests
  - [ ] Add error handling and edge case scenario tests
  - [ ] Add multi-user and multi-device scenario tests
  - [ ] Add data validation and quality control tests
  - [ ] Add security and authorization workflow tests

- [ ] **18. Performance Testing and Optimization** (Requirements: 3.1, 3.2)
  - [ ] Create performance test suite for manual measurement operations
  - [ ] Add load testing for high-volume measurement scenarios
  - [ ] Add stress testing for concurrent user access
  - [ ] Add comparison performance tests with large sensor datasets
  - [ ] Add database query performance tests
  - [ ] Add cache hit/miss ratio monitoring tests
  - [ ] Add response time benchmarking tests
  - [ ] Optimize based on performance test results

- [ ] **19. Monitoring and Health Checks** (Requirements: 4.3, 5.5)
  - [ ] Add health check endpoint for manual measurements service
  - [ ] Implement performance metrics collection
  - [ ] Add data quality metrics and validation monitoring
  - [ ] Implement comparison accuracy monitoring
  - [ ] Add user activity and API usage analytics
  - [ ] Implement error pattern detection and alerting
  - [ ] Add database health checks and monitoring
  - [ ] Implement service dependency health checks

- [ ] **20. Documentation and Deployment** (Requirements: 1.1, 1.2, 2.1, 3.1, 5.1)
  - [ ] Create comprehensive README.md with feature overview
  - [ ] Add API documentation with usage examples
  - [ ] Create user guide for manual measurements feature
  - [ ] Add developer documentation for extending the feature
  - [ ] Create deployment guide with configuration options
  - [ ] Add troubleshooting guide for common issues
  - [ ] Create performance tuning guide
  - [ ] Add security best practices documentation

Please confirm tasks.md and specify a task number to execute (e.g., 'run task 1').
