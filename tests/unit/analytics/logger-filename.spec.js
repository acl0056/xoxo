/**
 * @jest-environment node
 */

/**
 * Property-Based Tests for File Naming by Central Time
 *
 * Feature: session-analytics
 * Property 2: File Naming by Central Time
 *
 * For any session event timestamp, the daily log filename used SHALL correspond
 * to the Central_Time (America/Chicago) date of that timestamp, not the UTC date.
 *
 * Task: 2.3 Write property test for File Naming by Central Time
 * Validates: Requirements 1.1, 1.5
 */

const fc = require('fast-check');
const path = require('path');

jest.mock('fs');

const fs = require('fs');

/**
 * Generate a timestamp (in ms since epoch) within a valid range.
 * Using integers avoids any issues with fc.date() and fake timers.
 */
const timestampMillisArbitrary = fc.integer({
	min: new Date('2020-01-01T00:00:00Z').getTime(),
	max: new Date('2030-12-31T23:59:59Z').getTime(),
});

describe('Feature: session-analytics, Property 2: File Naming by Central Time', () => {
	let log;
	const originalSetImmediate = global.setImmediate;
	const RealDate = global.Date;

	beforeEach(() => {
		jest.resetModules();
		jest.mock('fs');

		// Replace setImmediate with synchronous execution
		global.setImmediate = (callback) => callback();

		const freshFs = require('fs');
		freshFs.mkdirSync.mockImplementation(() => {});
		freshFs.appendFileSync.mockImplementation(() => {});

		({ log } = require('../../../server/analytics/logger'));
	});

	afterEach(() => {
		global.setImmediate = originalSetImmediate;
		global.Date = RealDate;
		jest.restoreAllMocks();
	});

	/**
	 * Helper: compute the expected YYYY-MM-DD date string for a given Date
	 * in the America/Chicago timezone.
	 */
	function expectedCentralDate(date) {
		return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
	}

	/**
	 * Helper: create a minimal valid request object
	 */
	function makeRequest() {
		return {
			auth: { sub: 'user_test123' },
			headers: { 'x-forwarded-for': '192.168.1.1' },
			ip: '127.0.0.1',
		};
	}

	/**
	 * Helper: mock Date so new Date() returns the given timestamp,
	 * but new Date(...args) still works normally for internal use.
	 */
	function mockCurrentTime(timestampMs) {
		const MockDate = class extends RealDate {
			constructor(...args) {
				if (args.length === 0) {
					super(timestampMs);
				} else {
					super(...args);
				}
			}

			static now() {
				return timestampMs;
			}
		};
		global.Date = MockDate;
	}

	test('Property 2.1: Log filename date matches Central Time date for any timestamp', () => {
		fc.assert(
			fc.property(
				timestampMillisArbitrary,
				(timestampMs) => {
					const freshFs = require('fs');
					freshFs.appendFileSync.mockClear();
					freshFs.mkdirSync.mockClear();

					// Restore real Date for this computation
					global.Date = RealDate;
					const realDate = new RealDate(timestampMs);
					const expectedDate = expectedCentralDate(realDate);

					// Now mock Date so logger sees our timestamp
					mockCurrentTime(timestampMs);

					log(makeRequest());

					expect(freshFs.appendFileSync).toHaveBeenCalledTimes(1);
					const logFilePath = freshFs.appendFileSync.mock.calls[0][0];
					const filename = path.basename(logFilePath);

					const expectedFilename = `${expectedDate}.log`;
					expect(filename).toBe(expectedFilename);

					// Reset for next iteration
					global.Date = RealDate;
				},
			),
			{ numRuns: 200 },
		);
	});

	test('Property 2.2: Timestamps near midnight UTC that cross date boundary in Central Time', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 2020, max: 2030 }),
				fc.integer({ min: 1, max: 12 }),
				fc.integer({ min: 1, max: 28 }),
				fc.integer({ min: 0, max: 5 }),
				fc.integer({ min: 0, max: 59 }),
				fc.integer({ min: 0, max: 59 }),
				(year, month, day, hour, minute, second) => {
					const freshFs = require('fs');
					freshFs.appendFileSync.mockClear();
					freshFs.mkdirSync.mockClear();

					global.Date = RealDate;
					const timestamp = new RealDate(RealDate.UTC(year, month - 1, day, hour, minute, second));

					if (Number.isNaN(timestamp.getTime())) {
						return;
					}

					const expectedDate = expectedCentralDate(timestamp);
					mockCurrentTime(timestamp.getTime());

					log(makeRequest());

					expect(freshFs.appendFileSync).toHaveBeenCalledTimes(1);
					const logFilePath = freshFs.appendFileSync.mock.calls[0][0];
					const filename = path.basename(logFilePath);

					const expectedFilename = `${expectedDate}.log`;
					expect(filename).toBe(expectedFilename);

					global.Date = RealDate;
				},
			),
			{ numRuns: 200 },
		);
	});

	test('Property 2.3: A UTC midnight timestamp uses the previous day in Central Time', () => {
		const freshFs = require('fs');
		freshFs.appendFileSync.mockClear();

		// 2025-01-15T00:00:00Z is 2025-01-14T18:00:00 CST
		const timestamp = new RealDate('2025-01-15T00:00:00Z');
		mockCurrentTime(timestamp.getTime());

		log(makeRequest());

		expect(freshFs.appendFileSync).toHaveBeenCalledTimes(1);
		const logFilePath = freshFs.appendFileSync.mock.calls[0][0];
		const filename = path.basename(logFilePath);

		expect(filename).toBe('2025-01-14.log');

		global.Date = RealDate;
	});

	test('Property 2.4: A UTC date boundary during CDT uses the previous day in Central Time', () => {
		const freshFs = require('fs');
		freshFs.appendFileSync.mockClear();

		// 2025-07-15T00:00:00Z is 2025-07-14T19:00:00 CDT
		const timestamp = new RealDate('2025-07-15T00:00:00Z');
		mockCurrentTime(timestamp.getTime());

		log(makeRequest());

		expect(freshFs.appendFileSync).toHaveBeenCalledTimes(1);
		const logFilePath = freshFs.appendFileSync.mock.calls[0][0];
		const filename = path.basename(logFilePath);

		expect(filename).toBe('2025-07-14.log');

		global.Date = RealDate;
	});

	test('Property 2.5: Filename format is always YYYY-MM-DD.log', () => {
		fc.assert(
			fc.property(
				timestampMillisArbitrary,
				(timestampMs) => {
					const freshFs = require('fs');
					freshFs.appendFileSync.mockClear();
					freshFs.mkdirSync.mockClear();

					global.Date = RealDate;
					mockCurrentTime(timestampMs);

					log(makeRequest());

					expect(freshFs.appendFileSync).toHaveBeenCalledTimes(1);
					const logFilePath = freshFs.appendFileSync.mock.calls[0][0];
					const filename = path.basename(logFilePath);

					expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}\.log$/);

					global.Date = RealDate;
				},
			),
			{ numRuns: 100 },
		);
	});
});
