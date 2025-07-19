# Implementation Plan

(Note: Execute sequentially; test at end.)

- [ ] **1. Create DTOs and Exceptions** (Requirements: 4.1, 2.2)
  - [ ] Create `feed-analytics-response.dto.ts` with properties for FCR, total consumption, and summary.
  - [ ] Create `feed.exceptions.ts` with `InsufficientFeedDataException`.

- [ ] **2. Implement Analytics Service** (Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1)
  - [ ] Create `feed-analytics.service.ts`.
  - [ ] Implement `calculateFeedAnalytics` method to orchestrate analytics calculation.
  - [ ] Implement `calculateFCR` logic, fetching data from `FishService`.
  - [ ] Implement `calculateTotalConsumption` logic.
  - [ ] Implement `identifyFeedingPatterns` logic.
  - [ ] Add logic to throw `InsufficientFeedDataException` when necessary.

- [ ] **3. Update Core Feed Module** (Requirements: 3.1, 3.2, 4.2)
  - [ ] Inject `FeedAnalyticsService` into `feed.service.ts`.
  - [ ] Update `getAnalytics` in `feed.service.ts` to call the new analytics service.
  - [ ] Add `FeedAnalyticsService` to the providers in `feed.module.ts`.
  - [ ] Update `feed.controller.ts` to use `FeedAnalyticsResponseDto` in the `@ApiResponse` decorator.

- [ ] **4. Implement Testing** (Requirements: N/A, but good practice)
  - [ ] Create `feed-analytics.service.spec.ts` to unit test the analytics calculations.
  - [ ] Add tests for the `InsufficientFeedDataException` scenario.
  - [ ] Update `feed.service.spec.ts` to mock the new `FeedAnalyticsService`.
  - [ ] Update `feed.controller.spec.ts` to check for the new analytics response structure.

- [ ] **5. API Documentation** (Requirement: 4.2)
  - [ ] Ensure all new DTOs have `@ApiProperty` decorators for Swagger.
  - [ ] Verify the `@ApiResponse` in `feed.controller.ts` correctly reflects the success and error responses for the analytics endpoint.

Please confirm tasks.md to proceed.