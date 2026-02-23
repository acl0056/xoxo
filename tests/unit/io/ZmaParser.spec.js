import fs from 'fs';
import path from 'path';
import ZmaParser from '@/io/ZmaParser';

describe('ZmaParser', () => {
	describe('parse', () => {
		it('should parse a valid ZMA file from center project', () => {
			const zmaPath = 'tests/fixtures/projects/center/tweeter.zma';
			const result = ZmaParser.parse(zmaPath);

			expect(result).toHaveProperty('frequencies');
			expect(result).toHaveProperty('impedances');
			expect(result).toHaveProperty('phases');

			expect(Array.isArray(result.frequencies)).toBe(true);
			expect(Array.isArray(result.impedances)).toBe(true);
			expect(Array.isArray(result.phases)).toBe(true);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.impedances.length);
			expect(result.frequencies.length).toBe(result.phases.length);

			// Verify first data point
			expect(result.frequencies[0]).toBeCloseTo(1.029, 3);
			expect(result.impedances[0]).toBeCloseTo(2.798, 3);
			expect(result.phases[0]).toBeCloseTo(-1.411, 3);
		});

		it('should parse a valid ZMA file from tonic project', () => {
			const zmaPath = 'tests/fixtures/projects/tonic/tweeter.zma';
			const result = ZmaParser.parse(zmaPath);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.impedances.length);
			expect(result.frequencies.length).toBe(result.phases.length);
		});

		it('should parse a valid ZMA file from vivace project', () => {
			const zmaPath = 'tests/fixtures/projects/vivace/coax tweeter.zma';
			const result = ZmaParser.parse(zmaPath);

			expect(result.frequencies.length).toBeGreaterThan(0);
			expect(result.frequencies.length).toBe(result.impedances.length);
			expect(result.frequencies.length).toBe(result.phases.length);
		});

		it('should ensure frequencies are monotonically increasing', () => {
			const zmaPath = 'tests/fixtures/projects/center/tweeter.zma';
			const result = ZmaParser.parse(zmaPath);

			for (let i = 1; i < result.frequencies.length; i++) {
				expect(result.frequencies[i]).toBeGreaterThan(result.frequencies[i - 1]);
			}
		});

		it('should ensure all impedances are positive', () => {
			const zmaPath = 'tests/fixtures/projects/center/tweeter.zma';
			const result = ZmaParser.parse(zmaPath);

			for (let i = 0; i < result.impedances.length; i++) {
				expect(result.impedances[i]).toBeGreaterThan(0);
			}
		});

		it('should throw error for non-existent file', () => {
			expect(() => {
				ZmaParser.parse('nonexistent.zma');
			}).toThrow('ZMA file not found');
		});

		it('should throw error for file with non-numeric frequency', () => {
			const tempFile = 'tests/fixtures/temp-invalid-freq.zma';
			fs.writeFileSync(tempFile, '# Test\nabc\t8.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Invalid frequency value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for file with non-numeric impedance', () => {
			const tempFile = 'tests/fixtures/temp-invalid-imp.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\tabc\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Invalid impedance value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for file with non-numeric phase', () => {
			const tempFile = 'tests/fixtures/temp-invalid-phase.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\t8.0\tabc\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Invalid phase value');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for negative frequency', () => {
			const tempFile = 'tests/fixtures/temp-negative-freq.zma';
			fs.writeFileSync(tempFile, '# Test\n-100.0\t8.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Negative or zero frequency');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for zero frequency', () => {
			const tempFile = 'tests/fixtures/temp-zero-freq.zma';
			fs.writeFileSync(tempFile, '# Test\n0.0\t8.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Negative or zero frequency');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for negative impedance', () => {
			const tempFile = 'tests/fixtures/temp-negative-imp.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\t-8.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Negative or zero impedance');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for zero impedance', () => {
			const tempFile = 'tests/fixtures/temp-zero-imp.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\t0.0\t0.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Negative or zero impedance');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for non-monotonic frequencies', () => {
			const tempFile = 'tests/fixtures/temp-non-monotonic.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\t8.0\t0.0\n50.0\t8.5\t-5.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('Non-monotonic frequencies');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for empty file', () => {
			const tempFile = 'tests/fixtures/temp-empty.zma';
			fs.writeFileSync(tempFile, '# Test\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('No data found');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});

		it('should throw error for insufficient columns', () => {
			const tempFile = 'tests/fixtures/temp-insufficient.zma';
			fs.writeFileSync(tempFile, '# Test\n100.0\t8.0\n', 'utf8');

			try {
				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('expected 3 values');
			} finally {
				fs.unlinkSync(tempFile);
			}
		});
	});

	describe('export', () => {
		const tempOutputFile = 'tests/fixtures/temp-export.zma';

		afterEach(() => {
			if (fs.existsSync(tempOutputFile)) {
				fs.unlinkSync(tempOutputFile);
			}
		});

		it('should export valid ZMA data', () => {
			const frequencies = [100, 200, 300];
			const impedances = [8, 8.5, 9];
			const phases = [0, -5, -10];

			ZmaParser.export(frequencies, impedances, phases, tempOutputFile);

			expect(fs.existsSync(tempOutputFile)).toBe(true);

			const result = ZmaParser.parse(tempOutputFile);
			expect(result.frequencies).toEqual(frequencies);
			expect(result.impedances).toEqual(impedances);
			expect(result.phases).toEqual(phases);
		});

		it('should throw error for mismatched array lengths', () => {
			const frequencies = [100, 200];
			const impedances = [8, 8.5, 9];
			const phases = [0, -5];

			expect(() => {
				ZmaParser.export(frequencies, impedances, phases, tempOutputFile);
			}).toThrow('Array length mismatch');
		});

		it('should throw error for empty arrays', () => {
			expect(() => {
				ZmaParser.export([], [], [], tempOutputFile);
			}).toThrow('Cannot export empty data');
		});

		it('should throw error for non-monotonic frequencies', () => {
			const frequencies = [100, 50, 300];
			const impedances = [8, 8.5, 9];
			const phases = [0, -5, -10];

			expect(() => {
				ZmaParser.export(frequencies, impedances, phases, tempOutputFile);
			}).toThrow('Non-monotonic frequencies');
		});

		it('should throw error for negative frequency', () => {
			const frequencies = [-100, 200, 300];
			const impedances = [8, 8.5, 9];
			const phases = [0, -5, -10];

			expect(() => {
				ZmaParser.export(frequencies, impedances, phases, tempOutputFile);
			}).toThrow('Negative or zero frequency');
		});

		it('should throw error for negative impedance', () => {
			const frequencies = [100, 200, 300];
			const impedances = [8, -8.5, 9];
			const phases = [0, -5, -10];

			expect(() => {
				ZmaParser.export(frequencies, impedances, phases, tempOutputFile);
			}).toThrow('Negative or zero impedance');
		});

		it('should throw error for non-array parameters', () => {
			expect(() => {
				ZmaParser.export('not an array', [8], [0], tempOutputFile);
			}).toThrow('All parameters must be arrays');
		});
	});
});
