// Jest setup file for global test configuration
// This file runs before each test suite

import * as fc from 'fast-check';

// Configure fast-check for property-based testing
// Set minimum number of test runs to 100 as per design document requirements
fc.configureGlobal({
	numRuns: 100, // Minimum 100 iterations per property test
	verbose: true, // Show detailed output for debugging
	seed: Date.now(), // Use timestamp as seed for reproducibility
	endOnFailure: false, // Continue running tests after first failure to find all issues
});

// Export fast-check for use in tests
global.fc = fc;
