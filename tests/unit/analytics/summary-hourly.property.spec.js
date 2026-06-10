/**
 * @jest-environment node
 */
const fc = require('fast-check');
const path = require('path');

jest.mock('fs');

describe('Property 5: Hourly Distribution Completeness', () => {
	let writtenData;

	afterEach(() => {
		jest.restoreAllMocks();
	});

	/**
	 * Generate a random hour (0-23).
	 */
	function hourArbitrary() {
		return fc.integer({ min: 0, max: 23 });
	}

	/**
	 * Generate a random IP address.
	 */
	function ipArbitrary() {
		return fc.tuple(
			fc.integer({ min: 1, max: 255 }),
			fc.integer({ min: 0, max: 255 }),
			fc.integer({ min: 0, max: 255 }),
			fc.integer({ min: 1, max: 255 }),
		).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);
	}

	/**
	 * Generate a single log entry with a specific hour.
	 */
	function logEntryArbitrary(day) {
		return fc.tuple(hourArbitrary(), ipArbitrary()).map(([hour, ip]) => {
			const hourString = String(hour).padStart(2, '0');
			const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
			const second = String(Math.floor(Math.random() * 60)).padStart(2, '0');
			return JSON.stringify({
				timestamp: `2025-03-${String(day).padStart(2, '0')}T${hourString}:${minute}:${second}-05:00`,
				ip,
				userId: `user_${ip.replace(/\./g, '')}`,
			});
		});
	}

	/**
	 * Generate a set of log entries spread across multiple days.
	 */
	function logEntriesForMonthArbitrary() {
		return fc.array(
			fc.tuple(
				fc.integer({ min: 1, max: 28 }),
				fc.integer({ min: 1, max: 20 }),
			),
			{ minLength: 1, maxLength: 10 },
		).chain((dayEntryCounts) => {
			const entryArbitraries = dayEntryCounts.map(([day, count]) => fc.tuple(
				fc.constant(day),
				fc.array(logEntryArbitrary(day), { minLength: count, maxLength: count }),
			));
			return fc.tuple(...entryArbitraries);
		});
	}

	it('should produce hourlyDistribution with exactly 24 keys ("0" through "23") whose sum equals totalSessions', async () => {
		await fc.assert(
			fc.asyncProperty(
				logEntriesForMonthArbitrary(),
				async (dayEntries) => {
					jest.resetModules();
					jest.mock('fs');

					writtenData = null;

					const mockedFs = require('fs');
					const logsDirectory = path.resolve(__dirname, '../../../server/logs/');
					const summariesDirectory = path.resolve(__dirname, '../../../server/summaries/');

					// Build filenames and content from generated entries
					const fileMap = {};
					for (const [day, entries] of dayEntries) {
						const filename = `2025-03-${String(day).padStart(2, '0')}.log`;
						if (!fileMap[filename]) {
							fileMap[filename] = [];
						}
						fileMap[filename].push(...entries);
					}

					const filenames = Object.keys(fileMap).sort();

					mockedFs.existsSync.mockImplementation((filePath) => {
						if (filePath === logsDirectory) return true;
						if (filePath === summariesDirectory) return false;
						return false;
					});

					mockedFs.readdirSync.mockImplementation(() => filenames);

					mockedFs.readFileSync.mockImplementation((filePath) => {
						const basename = path.basename(filePath);
						if (fileMap[basename]) {
							return fileMap[basename].join('\n');
						}
						return '';
					});

					mockedFs.mkdirSync.mockImplementation(() => {});
					mockedFs.writeFileSync.mockImplementation((filePath, data) => {
						writtenData = data;
					});

					const { generate: freshGenerate } = require('../../../server/analytics/summary');
					await freshGenerate(2025, 3);

					expect(writtenData).not.toBeNull();
					const summary = JSON.parse(writtenData);

					// Verify hourlyDistribution has exactly 24 keys
					const hourlyKeys = Object.keys(summary.hourlyDistribution);
					expect(hourlyKeys).toHaveLength(24);

					// Verify keys are "0" through "23"
					for (let hour = 0; hour < 24; hour++) {
						expect(summary.hourlyDistribution).toHaveProperty(String(hour));
					}

					// Verify sum of all hourly values equals totalSessions
					const hourlySum = Object.values(summary.hourlyDistribution)
						.reduce((sum, count) => sum + count, 0);
					expect(hourlySum).toBe(summary.totalSessions);
				},
			),
			{ numRuns: 50 },
		);
	});
});
