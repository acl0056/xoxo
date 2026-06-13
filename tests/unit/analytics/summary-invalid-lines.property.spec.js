/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 9: Invalid Line Resilience
 *
 * **Validates: Requirements 2.7**
 *
 * For any daily log file containing a mix of valid and invalid JSON lines,
 * verify the summary counts only valid entries.
 */

jest.mock('fs');

describe('Property 9: Invalid Line Resilience', () => {
	let generate;
	let mockFs;
	let consoleWarnSpy;

	beforeEach(() => {
		jest.resetModules();
		jest.mock('fs');
		mockFs = require('fs');
		generate = require('../../../server/analytics/summary').generate;
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
		jest.restoreAllMocks();
	});

	/**
	 * Generate a valid log entry as a JSON string with proper timestamp, ip, and userId fields.
	 */
	function validLogEntryArbitrary(year, month, day) {
		const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return fc.record({
			hour: fc.integer({ min: 0, max: 23 }),
			minute: fc.integer({ min: 0, max: 59 }),
			second: fc.integer({ min: 0, max: 59 }),
			ip: fc.ipV4(),
			userId: fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/),
		}).map(({
			hour, minute, second, ip, userId,
		}) => {
			const timestamp = `${dateString}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}-06:00`;
			return JSON.stringify({ timestamp, ip, userId });
		});
	}

	/**
	 * Generate an invalid log line. This can be:
	 * - Random non-JSON text
	 * - Broken JSON (partial)
	 * - Valid JSON missing required fields
	 * - Numbers, booleans, arrays (valid JSON but not valid entries)
	 * - Empty strings / whitespace
	 */
	function invalidLineArbitrary() {
		return fc.oneof(
			// Random strings that aren't JSON
			fc.stringMatching(/^[a-zA-Z ]{1,50}$/),
			// Broken JSON (partial)
			fc.constant('{broken json'),
			fc.constant('{"timestamp":"2025-03-01T12:00:00-06:00"'),
			fc.constant('{invalid'),
			// Valid JSON missing required fields (no userId)
			fc.record({
				ip: fc.ipV4(),
			}).map(({ ip }) => JSON.stringify({ timestamp: '2025-03-01T12:00:00-06:00', ip })),
			// Valid JSON missing required fields (no ip)
			fc.constant(JSON.stringify({ timestamp: '2025-03-01T12:00:00-06:00', userId: 'user_1' })),
			// Valid JSON missing required fields (no timestamp)
			fc.constant(JSON.stringify({ ip: '1.2.3.4', userId: 'user_1' })),
			// Numbers
			fc.integer().map((n) => String(n)),
			// Booleans
			fc.boolean().map((b) => String(b)),
			// Arrays (valid JSON but not valid log entries)
			fc.constant('[1, 2, 3]'),
			fc.constant('[]'),
			// Empty strings / whitespace
			fc.constant(''),
			fc.constant('   '),
			fc.constant('\t'),
		);
	}

	/**
	 * Interleave valid and invalid lines in a random order.
	 */
	function mixedLogContentArbitrary(year, month, day) {
		return fc.record({
			validEntries: fc.array(validLogEntryArbitrary(year, month, day), { minLength: 0, maxLength: 8 }),
			invalidLines: fc.array(invalidLineArbitrary(), { minLength: 0, maxLength: 8 }),
		}).chain(({ validEntries, invalidLines }) => {
			const allLines = [
				...validEntries.map((line) => ({ line, valid: true })),
				...invalidLines.map((line) => ({ line, valid: false })),
			];
			// Shuffle the combined lines
			return fc.shuffledSubarray(allLines, { minLength: allLines.length, maxLength: allLines.length })
				.map((shuffled) => ({
					content: shuffled.map((item) => item.line).join('\n'),
					validCount: validEntries.length,
				}));
		});
	}

	it('totalSessions should equal only the count of valid entries, ignoring invalid lines', async () => {
		const year = 2025;
		const month = 3;
		const day = 15;
		const filename = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.log`;

		await fc.assert(
			fc.asyncProperty(
				mixedLogContentArbitrary(year, month, day),
				async ({ content, validCount }) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					generate = require('../../../server/analytics/summary').generate;

					let writtenData = null;

					mockFs.existsSync.mockImplementation((dirPath) => {
						if (dirPath.includes('summaries')) {
							return false;
						}
						return true;
					});

					mockFs.readdirSync.mockImplementation((dirPath) => {
						if (dirPath.includes('logs')) {
							return [filename];
						}
						return [];
					});

					mockFs.readFileSync.mockImplementation(() => content);

					mockFs.mkdirSync.mockImplementation(() => {});

					mockFs.writeFileSync.mockImplementation((outputPath, data) => {
						writtenData = data;
					});

					await generate(year, month);

					expect(writtenData).not.toBeNull();
					const summary = JSON.parse(writtenData);

					// Property: totalSessions equals only the number of valid entries
					expect(summary.totalSessions).toBe(validCount);
				},
			),
		);
	});

	it('dailyBreakdown sessions should reflect only valid entries', async () => {
		const year = 2025;
		const month = 6;
		const day = 10;
		const filename = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.log`;

		await fc.assert(
			fc.asyncProperty(
				mixedLogContentArbitrary(year, month, day).filter(({ validCount }) => validCount > 0),
				async ({ content, validCount }) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					generate = require('../../../server/analytics/summary').generate;

					let writtenData = null;

					mockFs.existsSync.mockImplementation((dirPath) => {
						if (dirPath.includes('summaries')) {
							return false;
						}
						return true;
					});

					mockFs.readdirSync.mockImplementation((dirPath) => {
						if (dirPath.includes('logs')) {
							return [filename];
						}
						return [];
					});

					mockFs.readFileSync.mockImplementation(() => content);

					mockFs.mkdirSync.mockImplementation(() => {});

					mockFs.writeFileSync.mockImplementation((outputPath, data) => {
						writtenData = data;
					});

					await generate(year, month);

					expect(writtenData).not.toBeNull();
					const summary = JSON.parse(writtenData);

					// dailyBreakdown should have one entry with sessions === validCount
					expect(summary.dailyBreakdown.length).toBe(1);
					expect(summary.dailyBreakdown[0].sessions).toBe(validCount);
				},
			),
		);
	});
});
