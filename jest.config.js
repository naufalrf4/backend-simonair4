const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: [
    '**/*.spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  
  // Enhanced module name mapping for proper path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/common/(.*)$': '<rootDir>/core/common/$1',
    '^@/core/(.*)$': '<rootDir>/core/$1',
    // Fallback to ts-jest pathsToModuleNameMapper for any remaining paths
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/../' }),
  },
  
  // Setup files for test environment
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  
  // Test timeout for async operations including MQTT and database
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests for better isolation
  resetMocks: true,
  
  // Restore mocks to prevent interference between test files
  restoreMocks: true,
  

  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Verbose output for better debugging
  verbose: true,
  

  
  // Global setup and teardown for database and MQTT environment
  globalSetup: '<rootDir>/../test/global-setup.ts',
  // globalTeardown: '<rootDir>/../test/global-teardown.ts',
  
  // Force exit to prevent hanging processes
  // forceExit: true,
  
  // Detect open handles to identify resource leaks
  detectOpenHandles: true,
};