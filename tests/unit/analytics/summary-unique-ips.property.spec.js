/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 4: Unique IP Consistency
 *
 * **Validates: Requirements 2.3, 2.6, 7.2, 7.3**
 *
 * For any set of valid daily log entries and historical IP data, verify:
 * 1. `uniqueIps` equals the length of `uniqueIpList`
 * 2. `returningIps + newIps` equals `uniqueIps`
 * 3. `uniqueIpList` contains exactly the distinct IPs from the entries
 */

jest.mock('fs');

describe('Property 4: Unique IP Consistency', () => {
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
			const timestamp = `${dateString}T${String(hour).padStart(2, '0')}:00:00-05:00`;
			return { line: JSON.stringify({ timestamp, ip, userId }), ip };
		});
	}

	/**
	 * Generate an arbitrary for a set of daily log files for a given month.
	 * Returns an object with a Map of filename -> file content and a Set of all IPs.
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
			const allIps = new Set();
			for (const { day, entries } of days) {
				if (entries.length > 0) {
					const filename = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.log`;
					files.set(filename, entries.map((entry) => entry.line).join('\n'));
					for (const entry of entries) {
						allIps.add(entry.ip);
					}
				}
			}
			return { files, allIps };
		});
	}

	/**
	 * Generate an arbitrary set of "prior month" IPs to simulate historical data.
	 */
	function priorMonthIpsArbitrary() {
		return fc.array(fc.ipV4(), { minLength: 0, maxLength: 10 });
	}

	it('uniqueIps should equal uniqueIpList.length and returningIps + newIps should equal uniqueIps', async () => {
		const year = 2025;
		const month = 3;

		await fc.assert(
			fc.asyncProperty(
				monthlyLogFilesArbitrary(year, month),
				priorMonthIpsArbitrary(),
				async ({ files: logFiles, allIps: expectedIps }, priorIps) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					generate = require('../../../server/analytics/summary').generate;

					const fileNames = Array.from(logFiles.keys());
					const priorIpSet = new Set(priorIps);

					// Build prior month summary files
					const priorSummaryFilename = '2025-02.json';
					const priorSummaryContent = JSON.stringify({
						uniqueIpList: Array.from(priorIpSet),
					});

					// Include target month's own summary file to test it's ignored
					const currentMonthSummaryFilename = '2025-03.json';

					let writtenData = null;

					mockFs.existsSync.mockImplementation(() => true);

					mockFs.readdirSync.mockImplementation((dirPath) => {
						if (dirPath.includes('logs')) {
							return fileNames;
						}
						// summaries directory — return prior month + current month
						return [priorSummaryFilename, currentMonthSummaryFilename];
					});

					mockFs.readFileSync.mockImplementation((filePath) => {
						const basename = filePath.split('/').pop();
						if (logFiles.has(basename)) {
							return logFiles.get(basename);
						}
						if (basename === priorSummaryFilename) {
							return priorSummaryContent;
						}
						return '{}';
					});

					mockFs.mkdirSync.mockImplementation(() => {});

					mockFs.writeFileSync.mockImplementation((outputPath, data) => {
						writtenData = data;
					});

					await generate(year, month);

					expect(writtenData).not.toBeNull();
					const summary = JSON.parse(writtenData);

					// Property 1: uniqueIps equals uniqueIpList.length
					expect(summary.uniqueIps).toBe(summary.uniqueIpList.length);

					// Property 2: returningIps + newIps equals uniqueIps
					expect(summary.returningIps + summary.newIps).toBe(summary.uniqueIps);

					// Property 3: uniqueIpList contains exactly the distinct IPs from entries
					const expectedIpsSorted = Array.from(expectedIps).sort();
					const actualIpsSorted = [...summary.uniqueIpList].sort();
					expect(actualIpsSorted).toEqual(expectedIpsSorted);
				},
			),
		);
	});
});
