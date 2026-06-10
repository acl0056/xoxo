/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 1: Log Entry Completeness
 *
 * **Validates: Requirements 1.2**
 *
 * For any valid timestamp, IP, and userId inputs, the NDJSON line written to
 * the daily log file SHALL contain exactly three fields (`timestamp`, `ip`,
 * `userId`), all non-empty strings, with no additional fields.
 */

jest.mock('fs');

describe('Property 1: Log Entry Completeness', () => {
	let logger;
	let capturedLines;
	const originalSetImmediate = global.setImmediate;

	beforeEach(() => {
		capturedLines = [];

		// Replace setImmediate with synchronous execution so the write happens immediately
		global.setImmediate = (callback) => callback();

		jest.resetModules();
		jest.mock('fs');
		const freshFs = require('fs');
		freshFs.mkdirSync.mockImplementation(() => {});
		freshFs.appendFileSync.mockImplementation((filePath, data) => {
			capturedLines.push(data);
		});
		logger = require('../../../server/analytics/logger');
	});

	afterEach(() => {
		global.setImmediate = originalSetImmediate;
		jest.restoreAllMocks();
	});

	it('should write NDJSON lines with exactly three non-empty string fields (timestamp, ip, userId)', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1 }).filter((s) => s.split(',')[0].trim().length > 0),
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				(ip, userId) => {
					capturedLines = [];

					const request = {
						headers: { 'x-forwarded-for': ip },
						ip: '127.0.0.1',
						auth: { sub: userId },
					};

					logger.log(request);

					// Verify exactly one line was written
					expect(capturedLines.length).toBe(1);

					// Parse the NDJSON line (strip trailing newline)
					const line = capturedLines[0].trimEnd();
					const parsed = JSON.parse(line);

					// Verify exactly three fields
					const keys = Object.keys(parsed);
					expect(keys.length).toBe(3);
					expect(keys.sort()).toEqual(['ip', 'timestamp', 'userId']);

					// Verify all values are non-empty strings
					expect(typeof parsed.timestamp).toBe('string');
					expect(parsed.timestamp.length).toBeGreaterThan(0);
					expect(typeof parsed.ip).toBe('string');
					expect(parsed.ip.length).toBeGreaterThan(0);
					expect(typeof parsed.userId).toBe('string');
					expect(parsed.userId.length).toBeGreaterThan(0);
				},
			),
		);
	});
});
