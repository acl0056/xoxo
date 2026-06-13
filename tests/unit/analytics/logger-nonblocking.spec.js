/**
 * Property-Based Test: Non-blocking Logging
 *
 * Feature: session-analytics
 * Property 8: Non-blocking Logging
 *
 * For any file system error condition during logging, verify log() never throws
 * an exception that propagates to the caller.
 *
 * Validates: Requirements 1.4
 */

import fc from 'fast-check';

const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('Feature: session-analytics, Property 8: Non-blocking Logging', () => {
	let logger;
	const originalConsoleError = console.error;

	beforeEach(() => {
		jest.useFakeTimers();
		console.error = jest.fn();
		jest.resetModules();
		jest.mock('fs');
		logger = require('../../../server/analytics/logger');
	});

	afterEach(() => {
		jest.useRealTimers();
		console.error = originalConsoleError;
		jest.restoreAllMocks();
	});

	/**
	 * Arbitrary for generating file system error types
	 */
	const fileSystemErrorArbitrary = fc.oneof(
		fc.constant({ code: 'EACCES', message: 'permission denied' }),
		fc.constant({ code: 'ENOSPC', message: 'no space left on device' }),
		fc.constant({ code: 'EROFS', message: 'read-only file system' }),
		fc.constant({ code: 'EIO', message: 'input/output error' }),
		fc.constant({ code: 'ENOMEM', message: 'out of memory' }),
		fc.string({ minLength: 1, maxLength: 50 }).map((message) => ({ code: undefined, message })),
	);

	/**
	 * Arbitrary for generating valid request objects
	 */
	const validRequestArbitrary = fc.record({
		auth: fc.record({
			sub: fc.string({ minLength: 1, maxLength: 50 }),
		}),
		headers: fc.record({
			'x-forwarded-for': fc.oneof(
				fc.ipV4().map((ip) => ip),
				fc.constant(undefined),
			),
		}),
		ip: fc.ipV4(),
	});

	/**
	 * Arbitrary for generating malformed request objects that may be missing properties
	 */
	const malformedRequestArbitrary = fc.oneof(
		fc.constant({}),
		fc.constant({ auth: null }),
		fc.constant({ auth: {} }),
		fc.constant({ auth: { sub: null } }),
		fc.constant({ headers: null }),
		fc.constant({ auth: { sub: 'user1' }, headers: null }),
		fc.constant({ auth: { sub: 'user1' } }),
		fc.record({
			auth: fc.oneof(
				fc.constant(null),
				fc.constant(undefined),
				fc.record({ sub: fc.oneof(fc.constant(null), fc.constant(undefined)) }),
			),
			headers: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant({})),
			ip: fc.oneof(fc.constant(undefined), fc.ipV4()),
		}),
	);

	test('Property 8.1: log() never throws when fs.mkdirSync throws', () => {
		fc.assert(
			fc.property(
				validRequestArbitrary,
				fileSystemErrorArbitrary,
				(request, errorInfo) => {
					const error = new Error(errorInfo.message);
					if (errorInfo.code) {
						error.code = errorInfo.code;
					}

					fs.mkdirSync.mockImplementation(() => {
						throw error;
					});
					fs.appendFileSync.mockImplementation(() => {});

					// log() itself should not throw
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8.2: log() never throws when fs.appendFileSync throws', () => {
		fc.assert(
			fc.property(
				validRequestArbitrary,
				fileSystemErrorArbitrary,
				(request, errorInfo) => {
					const error = new Error(errorInfo.message);
					if (errorInfo.code) {
						error.code = errorInfo.code;
					}

					fs.mkdirSync.mockImplementation(() => {});
					fs.appendFileSync.mockImplementation(() => {
						throw error;
					});

					// log() itself should not throw
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8.3: log() never throws when both fs.mkdirSync and fs.appendFileSync throw', () => {
		fc.assert(
			fc.property(
				validRequestArbitrary,
				fileSystemErrorArbitrary,
				fileSystemErrorArbitrary,
				(request, mkdirError, appendError) => {
					const error1 = new Error(mkdirError.message);
					if (mkdirError.code) {
						error1.code = mkdirError.code;
					}

					const error2 = new Error(appendError.message);
					if (appendError.code) {
						error2.code = appendError.code;
					}

					fs.mkdirSync.mockImplementation(() => {
						throw error1;
					});
					fs.appendFileSync.mockImplementation(() => {
						throw error2;
					});

					// log() itself should not throw
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8.4: log() never throws with malformed request objects', () => {
		fc.assert(
			fc.property(
				malformedRequestArbitrary,
				(request) => {
					fs.mkdirSync.mockImplementation(() => {});
					fs.appendFileSync.mockImplementation(() => {});

					// log() should never throw regardless of request shape
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8.5: log() never throws with malformed requests AND file system errors', () => {
		fc.assert(
			fc.property(
				malformedRequestArbitrary,
				fileSystemErrorArbitrary,
				(request, errorInfo) => {
					const error = new Error(errorInfo.message);
					if (errorInfo.code) {
						error.code = errorInfo.code;
					}

					fs.mkdirSync.mockImplementation(() => {
						throw error;
					});
					fs.appendFileSync.mockImplementation(() => {
						throw error;
					});

					// log() should never throw regardless of input or fs state
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8.6: log() never throws with various Error constructor types', () => {
		const errorConstructorArbitrary = fc.oneof(
			fc.string({ minLength: 1, maxLength: 30 }).map((message) => new Error(message)),
			fc.string({ minLength: 1, maxLength: 30 }).map((message) => new TypeError(message)),
			fc.string({ minLength: 1, maxLength: 30 }).map((message) => new RangeError(message)),
			fc.string({ minLength: 1, maxLength: 30 }).map((message) => new SyntaxError(message)),
		);

		fc.assert(
			fc.property(
				validRequestArbitrary,
				errorConstructorArbitrary,
				(request, error) => {
					fs.mkdirSync.mockImplementation(() => {
						throw error;
					});
					fs.appendFileSync.mockImplementation(() => {});

					// log() should not throw regardless of error type
					expect(() => logger.log(request)).not.toThrow();

					// Run the setImmediate callback — should also not throw
					expect(() => jest.runAllTimers()).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});
});
