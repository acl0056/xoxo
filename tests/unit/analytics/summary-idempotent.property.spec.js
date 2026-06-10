/**
 * @jest-environment node
 */

const fc = require('fast-check');

/**
 * Property 7: Idempotent Summary Generation
 *
 * **Validates: Requirements 2.9, 7.5**
 *
 * For any set of daily log files, verify running summary generation twice
 * produces identical output (excluding `generatedAt` which uses `new Date()`).
 */

jest.mock('fs');

describe('Property 7: Idempotent Summary Generation', () => {
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

	/**
	 * Set up fs mocks so that generate() reads the provided log files
	 * and captures written output.
	 */
	function setupFsMocks(logFiles, writtenOutputs) {
		const fileNames = Array.from(logFiles.keys());

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
			writtenOutputs.push(data);
		});
	}

	/**
	 * Remove the `generatedAt` field from a parsed summary for comparison.
	 * Since `generatedAt` uses `new Date().toISOString()`, it will differ
	 * between calls unless Date is mocked. We verify all other fields are
	 * identical to confirm idempotency of the computation.
	 */
	function removeGeneratedAt(summary) {
		const { generatedAt, ...rest } = summary;
		return rest;
	}

	it('running generate() twice with the same log files produces identical output (excluding generatedAt)', async () => {
		const year = 2025;
		const month = 4;

		await fc.assert(
			fc.asyncProperty(
				monthlyLogFilesArbitrary(year, month),
				async (logFiles) => {
					jest.resetModules();
					jest.mock('fs');
					mockFs = require('fs');
					generate = require('../../../server/analytics/summary').generate;

					const writtenOutputs = [];
					setupFsMocks(logFiles, writtenOutputs);

					// First generation
					await generate(year, month);

					// Second generation (re-setup mocks to reset writeFileSync captures cleanly)
					setupFsMocks(logFiles, writtenOutputs);
					await generate(year, month);

					// Both runs should have produced output
					expect(writtenOutputs.length).toBe(2);

					const firstSummary = JSON.parse(writtenOutputs[0]);
					const secondSummary = JSON.parse(writtenOutputs[1]);

					// All fields except generatedAt should be identical
					const firstWithoutTimestamp = removeGeneratedAt(firstSummary);
					const secondWithoutTimestamp = removeGeneratedAt(secondSummary);

					expect(firstWithoutTimestamp).toEqual(secondWithoutTimestamp);
				},
			),
		);
	});
});
