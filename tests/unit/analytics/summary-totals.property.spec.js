/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 3: Summary Totals Consistency
 *
 * **Validates: Requirements 2.2, 2.4, 7.1**
 *
 * For any set of valid daily log entries, verify `totalSessions` equals the
 * sum of all `sessions` values in `dailyBreakdown`.
 */

jest.mock('fs');

describe('Property 3: Summary Totals Consistency', () => {
	let generate;
	let mockFs;

	beforeEach(() => {
		jest.resetModules();
		jest.mock('fs');
		mockFs = require('fs');
		generate = require('../../../server/analytics/summary').generate;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	/**
	 * Generate an arbitrary for a single log entry with a valid timestamp
	 * for the given year, month, and day.
	 */
	function logEntryArbitrary(year, month, day) {
		const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return fc.record({
			hour: fc.integer({ min: 0, max: 23 }),
			ip: fc.ipV4(),
			userId: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
		}).map(({ hour, ip, userId }) => {
			const timestamp = `${dateString}T${String(hour).padStart(2, '0')}:00:00-06:00`;
			return JSON.stringify({ timestamp, ip, userId });
		});
	}

	/**
	 * Generate an arbitrary for a set of daily log files for a given month.
	 * Returns a Map of filename -> file content (NDJSON lines).
	 */
	function monthlyLogFilesArbitrary(year, month) {
		const daysInMonth = new Date(year, month, 0).getDate();
		const dayArbitraries = [];

		for (let day = 1; day <= daysInMonth; day++) {
			dayArbitraries.push(
				fc.array(logEntryArbitrary(year, month, day), { minLength: 0, maxLength: 5 })
					.map((entries) => ({
						day,
						entries,
					})),
			);
		}

		return fc.tuple(...dayArbitraries).map((days) => {
			const files = new Map();
			for (const { day, entries } of days) {
				if (entries.length > 0) {
					const filename = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.log`;
					files.set(filename, entries.join('\n'));
				}
			}
			return files;
		});
	}

	it('totalSessions should equal the sum of all sessions in dailyBreakdown', async () => {
		const year = 2025;
		const month = 3;

		await fc.assert(
			fc.asyncProperty(
				monthlyLogFilesArbitrary(year, month),
				async (logFiles) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					generate = require('../../../server/analytics/summary').generate;

					const fileNames = Array.from(logFiles.keys());

					let writtenData = null;

					mockFs.existsSync.mockImplementation(() => true);

					mockFs.readdirSync.mockImplementation((dirPath) => {
						if (dirPath.includes('logs')) {
							return fileNames;
						}
						// summaries directory — return empty for prior months
						return [];
					});

					mockFs.readFileSync.mockImplementation((filePath) => {
						const basename = filePath.split('/').pop();
						if (logFiles.has(basename)) {
							return logFiles.get(basename);
						}
						return '';
					});

					mockFs.mkdirSync.mockImplementation(() => {});

					mockFs.writeFileSync.mockImplementation((outputPath, data) => {
						writtenData = data;
					});

					await generate(year, month);

					// If no log files, no summary is written with sessions
					if (fileNames.length === 0) {
						// With no entries, totalSessions should be 0 and dailyBreakdown empty
						if (writtenData) {
							const summary = JSON.parse(writtenData);
							expect(summary.totalSessions).toBe(0);
							expect(summary.dailyBreakdown).toEqual([]);
						}
						return;
					}

					expect(writtenData).not.toBeNull();
					const summary = JSON.parse(writtenData);

					// Property: totalSessions === sum of dailyBreakdown sessions
					const sumOfDailySessions = summary.dailyBreakdown.reduce(
						(acc, day) => acc + day.sessions,
						0,
					);
					expect(summary.totalSessions).toBe(sumOfDailySessions);
				},
			),
		);
	});
});
