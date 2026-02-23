import fs from 'fs';
import fc from 'fast-check';
import ZmaParser from '@/io/ZmaParser';

describe('ZmaParser Property-Based Tests', () => {
	describe('Feature: crossover-network-simulator, Property 21: FRD/ZMA parsing produces monotonic frequencies', () => {
		/**
		 * Validates: Requirements 7.4, 7.6
		 *
		 * For any valid ZMA file with frequency-value pairs, parsing should produce
		 * arrays of frequencies and values, and the frequencies should be monotonically increasing.
		 */
		it('should produce monotonically increasing frequencies for any valid ZMA data', () => {
			// Generator for valid ZMA data
			const zmaDataGenerator = fc.integer({ min: 1, max: 100 }).chain((length) => fc.record({
				frequencies: fc.array(fc.double({ min: 1, max: 100000, noNaN: true }), { minLength: length, maxLength: length })
					.map((frequencies) => {
						// Sort and ensure uniqueness for monotonic property
						const sorted = [...new Set(frequencies)].sort((a, b) => a - b);
						// If we lost elements due to duplicates, pad with incremental values
						while (sorted.length < length) {
							const lastValue = sorted[sorted.length - 1];
							sorted.push(lastValue + 1);
						}
						return sorted.slice(0, length);
					}),
				impedances: fc.array(fc.double({ min: 0.1, max: 1000, noNaN: true }), { minLength: length, maxLength: length }),
				phases: fc.array(fc.double({ min: -180, max: 180, noNaN: true }), { minLength: length, maxLength: length }),
			}));

			fc.assert(
				fc.property(zmaDataGenerator, (data) => {
					const tempFile = 'tests/fixtures/temp-pbt-zma.zma';

					try {
						// Export the generated data
						ZmaParser.export(data.frequencies, data.impedances, data.phases, tempFile);

						// Parse it back
						const result = ZmaParser.parse(tempFile);

						// Verify frequencies are monotonically increasing
						for (let i = 1; i < result.frequencies.length; i++) {
							expect(result.frequencies[i]).toBeGreaterThan(result.frequencies[i - 1]);
						}

						// Verify all impedances are positive
						for (let i = 0; i < result.impedances.length; i++) {
							expect(result.impedances[i]).toBeGreaterThan(0);
						}

						// Verify data integrity
						expect(result.frequencies.length).toBe(data.frequencies.length);
						expect(result.impedances.length).toBe(data.impedances.length);
						expect(result.phases.length).toBe(data.phases.length);

						// Verify values match (with floating point tolerance)
						for (let i = 0; i < result.frequencies.length; i++) {
							expect(result.frequencies[i]).toBeCloseTo(data.frequencies[i], 10);
							expect(result.impedances[i]).toBeCloseTo(data.impedances[i], 10);
							expect(result.phases[i]).toBeCloseTo(data.phases[i], 10);
						}
					} finally {
						if (fs.existsSync(tempFile)) {
							fs.unlinkSync(tempFile);
						}
					}
				}),
				{ numRuns: 100 },
			);
		});

		it('should parse all real ZMA fixture files with monotonic frequencies', () => {
			const zmaFiles = [
				'tests/fixtures/projects/center/tweeter.zma',
				'tests/fixtures/projects/center/woofers.zma',
				'tests/fixtures/projects/tonic/tweeter.zma',
				'tests/fixtures/projects/tonic/woofer.zma',
				'tests/fixtures/projects/vivace/coax tweeter.zma',
				'tests/fixtures/projects/vivace/coax 4 inch woofer.zma',
				'tests/fixtures/projects/vivace/dual 6 inch ceramic woofers.zma',
			];

			for (const zmaFile of zmaFiles) {
				const result = ZmaParser.parse(zmaFile);

				// Verify frequencies are monotonically increasing
				for (let i = 1; i < result.frequencies.length; i++) {
					expect(result.frequencies[i]).toBeGreaterThan(result.frequencies[i - 1]);
				}

				// Verify all frequencies are positive
				for (let i = 0; i < result.frequencies.length; i++) {
					expect(result.frequencies[i]).toBeGreaterThan(0);
				}

				// Verify all impedances are positive
				for (let i = 0; i < result.impedances.length; i++) {
					expect(result.impedances[i]).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('Feature: crossover-network-simulator, Property 22: Invalid data error reporting', () => {
		/**
		 * Validates: Requirements 7.5
		 *
		 * For any ZMA file with invalid values (non-numeric, negative frequencies, non-monotonic),
		 * parsing should produce specific error messages identifying the problem.
		 */
		it('should report specific errors for non-monotonic frequencies', () => {
			const nonMonotonicGenerator = fc.integer({ min: 2, max: 10 }).chain((length) => fc.record({
				frequencies: fc.array(fc.double({ min: 1, max: 100000, noNaN: true }), { minLength: length, maxLength: length })
					.map((frequencies) => {
						// Intentionally create non-monotonic data by reversing
						return frequencies.sort((a, b) => b - a);
					}),
				impedances: fc.array(fc.double({ min: 0.1, max: 1000, noNaN: true }), { minLength: length, maxLength: length }),
				phases: fc.array(fc.double({ min: -180, max: 180, noNaN: true }), { minLength: length, maxLength: length }),
			}));

			fc.assert(
				fc.property(nonMonotonicGenerator, (data) => {
					const tempFile = 'tests/fixtures/temp-pbt-invalid-zma.zma';

					try {
						// Manually write non-monotonic data
						const lines = ['# Test'];
						for (let i = 0; i < data.frequencies.length; i++) {
							lines.push(`${data.frequencies[i]}\t${data.impedances[i]}\t${data.phases[i]}`);
						}
						require('fs').writeFileSync(tempFile, lines.join('\n'), 'utf8');

						// Attempt to parse should throw
						expect(() => {
							ZmaParser.parse(tempFile);
						}).toThrow('Non-monotonic frequencies');
					} finally {
						if (require('fs').existsSync(tempFile)) {
							require('fs').unlinkSync(tempFile);
						}
					}
				}),
				{ numRuns: 100 },
			);
		});

		it('should report specific errors for negative frequencies', () => {
			const negativeFrequencyGenerator = fc.record({
				frequency: fc.double({ min: -100000, max: -0.1, noNaN: true }),
				impedance: fc.double({ min: 0.1, max: 1000, noNaN: true }),
				phase: fc.double({ min: -180, max: 180, noNaN: true }),
			});

			fc.assert(
				fc.property(negativeFrequencyGenerator, (data) => {
					const tempFile = 'tests/fixtures/temp-pbt-negative-freq.zma';

					try {
						const content = `# Test\n${data.frequency}\t${data.impedance}\t${data.phase}\n`;
						require('fs').writeFileSync(tempFile, content, 'utf8');

						expect(() => {
							ZmaParser.parse(tempFile);
						}).toThrow('Negative or zero frequency');
					} finally {
						if (require('fs').existsSync(tempFile)) {
							require('fs').unlinkSync(tempFile);
						}
					}
				}),
				{ numRuns: 100 },
			);
		});

		it('should report specific errors for negative impedances', () => {
			const negativeImpedanceGenerator = fc.record({
				frequency: fc.double({ min: 1, max: 100000, noNaN: true }),
				impedance: fc.double({ min: -1000, max: -0.1, noNaN: true }),
				phase: fc.double({ min: -180, max: 180, noNaN: true }),
			});

			fc.assert(
				fc.property(negativeImpedanceGenerator, (data) => {
					const tempFile = 'tests/fixtures/temp-pbt-negative-imp.zma';

					try {
						const content = `# Test\n${data.frequency}\t${data.impedance}\t${data.phase}\n`;
						require('fs').writeFileSync(tempFile, content, 'utf8');

						expect(() => {
							ZmaParser.parse(tempFile);
						}).toThrow('Negative or zero impedance');
					} finally {
						if (require('fs').existsSync(tempFile)) {
							require('fs').unlinkSync(tempFile);
						}
					}
				}),
				{ numRuns: 100 },
			);
		});

		it('should report specific errors for empty files', () => {
			const tempFile = 'tests/fixtures/temp-pbt-empty.zma';

			try {
				require('fs').writeFileSync(tempFile, '# Test\n', 'utf8');

				expect(() => {
					ZmaParser.parse(tempFile);
				}).toThrow('No data found');
			} finally {
				if (require('fs').existsSync(tempFile)) {
					require('fs').unlinkSync(tempFile);
				}
			}
		});
	});
});
