import fs from 'fs';
import path from 'path';
import FrdParser from '@/io/FrdParser';

describe('FrdParser', () => {
	describe('parse', () => {
		it('should parse a valid FRD file from center project', () => {
			const frdPath = 'tests/fixtures/projects/center/1m tweeter 0.frd';
			const result = FrdParser.parse(frdPath);

			expect(result).toHaveProperty('frequencies');
			expect(result).toHaveProperty('magnitudes');
			expect(result).toHaveProperty('phases');

			expect(Array.isArray(result.frequencies)).toBe(true);
			expect(Array.isArray(result.magnitudes)).toBe(true);
			expect(Array.isArray(result.phases)).toBe(true);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.magnitudes.length);
			expect(result.frequencies.length).toBe(result.phases.length);

			// Verify first data point
			expect(result.frequencies[0]).toBeCloseTo(4.9182, 4);
			expect(result.magnitudes[0]).toBeCloseTo(52.3, 1);
			expect(result.phases[0]).toBeCloseTo(143.6, 1);
		});

		it('should parse a valid FRD file from tonic project', () => {
			const frdPath = 'tests/fixtures/projects/tonic/tweeter 0.frd';
			const result = FrdParser.parse(frdPath);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.magnitudes.length);
			expect(result.frequencies.length).toBe(result.phases.length);
		});

		it('should parse a valid FRD file from vivace project', () => {
			const frdPath = 'tests/fixtures/projects/vivace/tweeter.frd';
			const result = FrdParser.parse(frdPath);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.magnitudes.length);
			expect(result.frequencies.length).toBe(result.phases.length);
		});

		it('should ensure frequencies are monotonically increasing', () => {
			const frdPath = 'tests/fixtures/projects/center/1m tweeter 0.frd';
			const result = FrdParser.parse(frdPath);

			for (let i = 1; i < result.frequencies.length; i++) {
				expect(result.frequencies[i]).toBeGreaterThan(result.frequencies[i - 1]);
			}
		});

		it('should throw error for non-existent file', () => {
			expect(() => {
				FrdParser.parse('nonexistent.frd');
			}).toThrow('FRD file not found');
		});

		it('should throw error for file with non-numeric frequency', () => {
			const tempFile = 'tests/fixtures/temp-invalid-freq.frd';
			fs.writeFileSync(tempFile, '# Test\nabc\t85.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Invalid frequency value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for file with non-numeric magnitude', () => {
			const tempFile = 'tests/fixtures/temp-invalid-mag.frd';
			fs.writeFileSync(tempFile, '# Test\n100.0\tabc\t0.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Invalid magnitude value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for file with non-numeric phase', () => {
			const tempFile = 'tests/fixtures/temp-invalid-phase.frd';
			fs.writeFileSync(tempFile, '# Test\n100.0\t85.0\tabc\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Invalid phase value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for negative frequency', () => {
			const tempFile = 'tests/fixtures/temp-negative-freq.frd';
			fs.writeFileSync(tempFile, '# Test\n-100.0\t85.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Negative or zero frequency');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for zero frequency', () => {
			const tempFile = 'tests/fixtures/temp-zero-freq.frd';
			fs.writeFileSync(tempFile, '# Test\n0.0\t85.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Negative or zero frequency');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for non-monotonic frequencies', () => {
			const tempFile = 'tests/fixtures/temp-non-monotonic.frd';
			fs.writeFileSync(tempFile, '# Test\n100.0\t85.0\t0.0\n50.0\t86.0\t-5.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('Non-monotonic frequencies');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for empty file', () => {
			const tempFile = 'tests/fixtures/temp-empty.frd';
			fs.writeFileSync(tempFile, '# Test\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('No data found');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for insufficient columns', () => {
			const tempFile = 'tests/fixtures/temp-insufficient.frd';
			fs.writeFileSync(tempFile, '# Test\n100.0\t85.0\n', 'utf8');

			try {
				expect(() => {
					FrdParser.parse(tempFile);
				}).toThrow('expected 3 values');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});
	});

	describe('export', () => {
		const tempOutputFile = 'tests/fixtures/temp-export.frd';

		afterEach(() => {
			if (fs.existsSync(tempOutputFile)) {
				fs.unlinkSync(tempOutputFile);
			}
		});

		it('should export valid FRD data', () => {
			const frequencies = [100, 200, 300];
			const magnitudes = [85, 86, 87];
			const phases = [0, -5, -10];

			FrdParser.export(frequencies, magnitudes, phases, tempOutputFile);

			expect(fs.existsSync(tempOutputFile)).toBe(true);

			const result = FrdParser.parse(tempOutputFile);
			expect(result.frequencies).toEqual(frequencies);
			expect(result.magnitudes).toEqual(magnitudes);
			expect(result.phases).toEqual(phases);
		});

		it('should throw error for mismatched array lengths', () => {
			const frequencies = [100, 200];
			const magnitudes = [85, 86, 87];
			const phases = [0, -5];

			expect(() => {
				FrdParser.export(frequencies, magnitudes, phases, tempOutputFile);
			}).toThrow('Array length mismatch');
		});

		it('should throw error for empty arrays', () => {
			expect(() => {
				FrdParser.export([], [], [], tempOutputFile);
			}).toThrow('Cannot export empty data');
		});

		it('should throw error for non-monotonic frequencies', () => {
			const frequencies = [100, 50, 300];
			const magnitudes = [85, 86, 87];
			const phases = [0, -5, -10];

			expect(() => {
				FrdParser.export(frequencies, magnitudes, phases, tempOutputFile);
			}).toThrow('Non-monotonic frequencies');
		});

		it('should throw error for negative frequency', () => {
			const frequencies = [-100, 200, 300];
			const magnitudes = [85, 86, 87];
			const phases = [0, -5, -10];

			expect(() => {
				FrdParser.export(frequencies, magnitudes, phases, tempOutputFile);
			}).toThrow('Negative or zero frequency');
		});

		it('should throw error for non-array parameters', () => {
			expect(() => {
				FrdParser.export('not an array', [85], [0], tempOutputFile);
			}).toThrow('All parameters must be arrays');
		});
	});
});
