const fc = require('fast-check');
const path = require('path');

jest.mock('fs', () => {
	const original = jest.requireActual('fs');
	return {
		...original,
		promises: {
			...original.promises,
			readdir: jest.fn(),
			unlink: jest.fn(),
		},
	};
});

const fs = require('fs');

describe('Property 6: Cleanup Safety', () => {
	let cleanOldLogs;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.resetModules();

		jest.mock('fs', () => {
			const original = jest.requireActual('fs');
			return {
				...original,
				promises: {
					...original.promises,
					readdir: jest.fn(),
					unlink: jest.fn(),
				},
			};
		});

		const freshFs = require('fs');
		freshFs.promises.readdir.mockImplementation(async () => []);
		freshFs.promises.unlink.mockImplementation(async () => {});

		({ cleanOldLogs } = require('../../../server/analytics/cleanup'));
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	/**
	 * Generate a valid YYYY-MM-DD.log filename with a date within a reasonable range.
	 */
	function validLogFilenameArbitrary() {
		return fc.date({
			min: new Date('2020-01-01'),
			max: new Date('2030-12-31'),
		}).map((date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}.log`;
		});
	}

	/**
	 * Generate a filename that does NOT match the YYYY-MM-DD.log regex pattern.
	 * The cleanup module uses /^(\d{4})-(\d{2})-(\d{2})\.log$/ so we must avoid
	 * anything matching that pattern (even with invalid month/day numbers).
	 */
	function invalidFilenameArbitrary() {
		return fc.oneof(
			// .txt files
			fc.string({ minLength: 1, maxLength: 10 }).map((s) => `${s.replace(/[/\0]/g, '_')}.txt`),
			// Filenames that clearly don't match the pattern
			fc.constantFrom(
				'not-a-date.log',
				'abcd-ef-gh.log',
				'readme.md',
				'.gitkeep',
				'2025-01-15.log.bak',
				'log-2025-01-15',
				'notes.txt',
				'data.json',
				'2025-1-5.log',
				'25-01-15.log',
			),
		);
	}

	it('should only delete files matching YYYY-MM-DD.log older than 60 days, preserving all others', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(validLogFilenameArbitrary(), { minLength: 0, maxLength: 15 }),
				fc.array(invalidFilenameArbitrary(), { minLength: 0, maxLength: 10 }),
				fc.date({ min: new Date('2023-01-01'), max: new Date('2028-12-31') }),
				async (validFiles, invalidFiles, currentDate) => {
					const allFiles = [...new Set([...validFiles, ...invalidFiles])];
					const deletedFiles = [];

					const freshFs = require('fs');
					freshFs.promises.readdir.mockImplementation(async () => allFiles);
					freshFs.promises.unlink.mockImplementation(async (filePath) => {
						deletedFiles.push(path.basename(filePath));
					});

					jest.setSystemTime(currentDate);

					await cleanOldLogs();

					const cutoffDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate() - 60,
					);

					for (const filename of deletedFiles) {
						// Every deleted file must match the YYYY-MM-DD.log pattern
						const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.log$/);
						expect(match).not.toBeNull();

						// And its date must be more than 60 days old
						const fileDate = new Date(
							parseInt(match[1], 10),
							parseInt(match[2], 10) - 1,
							parseInt(match[3], 10),
						);
						expect(fileDate < cutoffDate).toBe(true);
					}

					// Verify no invalid files were deleted
					for (const filename of invalidFiles) {
						expect(deletedFiles).not.toContain(filename);
					}

					// Verify files 60 days old or less were NOT deleted
					for (const filename of validFiles) {
						const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.log$/);
						if (match) {
							const fileDate = new Date(
								parseInt(match[1], 10),
								parseInt(match[2], 10) - 1,
								parseInt(match[3], 10),
							);
							if (fileDate >= cutoffDate) {
								expect(deletedFiles).not.toContain(filename);
							}
						}
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});
