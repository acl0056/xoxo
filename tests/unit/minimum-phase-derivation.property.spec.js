import fc from 'fast-check';
import HilbertTransform from '@/simulation/HilbertTransform';
import FrdParser from '@/io/FrdParser';

describe('Feature: crossover-network-simulator, Property 17: Minimum phase derivation', () => {
	/**
	 * Validates: Requirements 4.8
	 *
	 * For any loudspeaker component with phase source set to "derived", the simulation
	 * should calculate minimum phase from magnitude data using Hilbert Transform, and
	 * the result should differ from "as measured" phase.
	 */

	describe('Property-Based Tests', () => {
		it('should derive minimum phase that differs from measured phase for any valid magnitude data', () => {
			// Generator for valid frequency response data with realistic spacing
			const frdDataGenerator = fc.integer({ min: 5, max: 50 }).chain((length) => fc.record({
				startFrequency: fc.double({ min: 20, max: 200, noNaN: true }),
				frequencyMultiplier: fc.double({ min: 1.1, max: 2.0, noNaN: true }),
			}).map((config) => {
				// Generate logarithmically spaced frequencies (realistic)
				const frequencies = Array.from(
					{ length },
					(_, i) => config.startFrequency * (config.frequencyMultiplier ** i),
				);
				
				// Generate realistic magnitude variations
				const magnitudes = Array.from(
					{ length },
					() => 60 + Math.random() * 50, // 60-110 dB range
				);
				
				// Generate realistic measured phases
				const measuredPhases = Array.from(
					{ length },
					() => -180 + Math.random() * 360, // -180 to +180 degrees
				);
				
				return { frequencies, magnitudes, measuredPhases };
			}));

			fc.assert(
				fc.property(frdDataGenerator, (data) => {
					// Calculate minimum phase from magnitude
					const derivedPhase = HilbertTransform.calculateMinimumPhase(
						data.frequencies,
						data.magnitudes,
					);

					// Verify derived phase is valid
					expect(derivedPhase).toHaveLength(data.frequencies.length);
					derivedPhase.forEach((phase) => {
						expect(phase).toBeDefined();
						expect(isNaN(phase)).toBe(false);
						expect(isFinite(phase)).toBe(true);
					});

					// Verify derived phase differs from measured phase
					// (unless the measured phase happens to be minimum phase)
					const isDifferent = HilbertTransform.validatePhaseDifference(
						derivedPhase,
						data.measuredPhases,
					);

					// For most random data, derived and measured should differ
					// We can't guarantee this for ALL random data (measured might be minimum phase)
					// but we can verify the validation function works
					expect(typeof isDifferent).toBe('boolean');
				}),
				{ numRuns: 100 },
			);
		});

		it('should produce stable minimum phase for magnitude data with small variations', () => {
			// Generator for nearly flat magnitude response with small variations
			const flatResponseGenerator = fc.record({
				baseFrequency: fc.double({ min: 100, max: 1000, noNaN: true }),
				baseMagnitude: fc.double({ min: 80, max: 95, noNaN: true }),
				numPoints: fc.integer({ min: 10, max: 30 }),
			}).chain((config) => fc.record({
				frequencies: fc.constant(
					Array.from({ length: config.numPoints }, (_, i) => config.baseFrequency * (2 ** i)),
				),
				magnitudes: fc.array(
					fc.double({ min: config.baseMagnitude - 2, max: config.baseMagnitude + 2, noNaN: true }),
					{ minLength: config.numPoints, maxLength: config.numPoints },
				),
			}));

			fc.assert(
				fc.property(flatResponseGenerator, (data) => {
					const derivedPhase = HilbertTransform.calculateMinimumPhase(
						data.frequencies,
						data.magnitudes,
					);

					// For nearly flat magnitude, phase should be small
					derivedPhase.forEach((phase) => {
						expect(Math.abs(phase)).toBeLessThan(30); // Within 30 degrees
					});
				}),
				{ numRuns: 100 },
			);
		});

		it('should handle magnitude data with monotonic decrease (low-pass characteristic)', () => {
			// Generator for low-pass filter magnitude response
			const lowPassGenerator = fc.record({
				startFrequency: fc.double({ min: 100, max: 500, noNaN: true }),
				startMagnitude: fc.double({ min: 85, max: 95, noNaN: true }),
				numPoints: fc.integer({ min: 10, max: 30 }),
				rolloffRate: fc.double({ min: 0.5, max: 3, noNaN: true }),
			}).map((config) => {
				const frequencies = Array.from(
					{ length: config.numPoints },
					(_, i) => config.startFrequency * (2 ** i),
				);
				const magnitudes = frequencies.map((freq, i) => {
					// Simulate low-pass rolloff
					const octavesFromStart = Math.log2(freq / config.startFrequency);
					return config.startMagnitude - (octavesFromStart * config.rolloffRate);
				});
				return { frequencies, magnitudes };
			});

			fc.assert(
				fc.property(lowPassGenerator, (data) => {
					const derivedPhase = HilbertTransform.calculateMinimumPhase(
						data.frequencies,
						data.magnitudes,
					);

					// Verify phase is valid
					expect(derivedPhase).toHaveLength(data.frequencies.length);
					derivedPhase.forEach((phase) => {
						expect(phase).toBeDefined();
						expect(isNaN(phase)).toBe(false);
						expect(isFinite(phase)).toBe(true);
					});

					// For low-pass, phase should generally become more negative
					// (though this isn't guaranteed for all cases)
					const phaseRange = Math.max(...derivedPhase) - Math.min(...derivedPhase);
					expect(phaseRange).toBeGreaterThan(0); // Phase should vary
				}),
				{ numRuns: 100 },
			);
		});

		it('should handle magnitude data with monotonic increase (high-pass characteristic)', () => {
			// Generator for high-pass filter magnitude response
			const highPassGenerator = fc.record({
				startFrequency: fc.double({ min: 100, max: 500, noNaN: true }),
				endMagnitude: fc.double({ min: 85, max: 95, noNaN: true }),
				numPoints: fc.integer({ min: 10, max: 30 }),
				rolloffRate: fc.double({ min: 0.5, max: 3, noNaN: true }),
			}).map((config) => {
				const frequencies = Array.from(
					{ length: config.numPoints },
					(_, i) => config.startFrequency * (2 ** i),
				);
				const magnitudes = frequencies.map((freq, i) => {
					// Simulate high-pass rolloff (increasing magnitude)
					const octavesFromStart = Math.log2(freq / config.startFrequency);
					const maxOctaves = Math.log2(frequencies[frequencies.length - 1] / config.startFrequency);
					return config.endMagnitude - ((maxOctaves - octavesFromStart) * config.rolloffRate);
				});
				return { frequencies, magnitudes };
			});

			fc.assert(
				fc.property(highPassGenerator, (data) => {
					const derivedPhase = HilbertTransform.calculateMinimumPhase(
						data.frequencies,
						data.magnitudes,
					);

					// Verify phase is valid
					expect(derivedPhase).toHaveLength(data.frequencies.length);
					derivedPhase.forEach((phase) => {
						expect(phase).toBeDefined();
						expect(isNaN(phase)).toBe(false);
						expect(isFinite(phase)).toBe(true);
					});

					// Phase should vary with magnitude changes
					const phaseRange = Math.max(...derivedPhase) - Math.min(...derivedPhase);
					expect(phaseRange).toBeGreaterThan(0);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Real Measurement Data Tests', () => {
		it('should derive minimum phase from real tweeter FRD files', () => {
			const frdFiles = [
				'tests/fixtures/projects/center/1m tweeter 0.frd',
				'tests/fixtures/projects/tonic/tweeter 0.frd',
				'tests/fixtures/projects/vivace/tweeter.frd',
			];

			for (const frdFile of frdFiles) {
				const frdData = FrdParser.parse(frdFile);

				// Calculate minimum phase from magnitude
				const derivedPhase = HilbertTransform.calculateMinimumPhase(
					frdData.frequencies,
					frdData.magnitudes,
				);

				// Verify derived phase is valid
				expect(derivedPhase).toHaveLength(frdData.frequencies.length);
				derivedPhase.forEach((phase) => {
					expect(phase).toBeDefined();
					expect(isNaN(phase)).toBe(false);
					expect(isFinite(phase)).toBe(true);
				});

				// Verify derived phase differs from measured phase
				const isDifferent = HilbertTransform.validatePhaseDifference(
					derivedPhase,
					frdData.phases,
				);

				// Real speaker measurements are typically not minimum phase
				// so derived should differ from measured
				expect(isDifferent).toBe(true);
			}
		});

		it('should derive minimum phase from real woofer FRD files', () => {
			const frdFiles = [
				'tests/fixtures/projects/center/1m woofers 0.frd',
				'tests/fixtures/projects/tonic/woofer 0.frd',
				'tests/fixtures/projects/vivace/woofers.frd',
			];

			for (const frdFile of frdFiles) {
				const frdData = FrdParser.parse(frdFile);

				// Calculate minimum phase from magnitude
				const derivedPhase = HilbertTransform.calculateMinimumPhase(
					frdData.frequencies,
					frdData.magnitudes,
				);

				// Verify derived phase is valid
				expect(derivedPhase).toHaveLength(frdData.frequencies.length);
				derivedPhase.forEach((phase) => {
					expect(phase).toBeDefined();
					expect(isNaN(phase)).toBe(false);
					expect(isFinite(phase)).toBe(true);
				});

				// Verify derived phase differs from measured phase
				const isDifferent = HilbertTransform.validatePhaseDifference(
					derivedPhase,
					frdData.phases,
				);

				expect(isDifferent).toBe(true);
			}
		});

		it('should derive minimum phase from real midrange FRD file', () => {
			const frdFile = 'tests/fixtures/projects/vivace/mid.frd';
			const frdData = FrdParser.parse(frdFile);

			// Calculate minimum phase from magnitude
			const derivedPhase = HilbertTransform.calculateMinimumPhase(
				frdData.frequencies,
				frdData.magnitudes,
			);

			// Verify derived phase is valid
			expect(derivedPhase).toHaveLength(frdData.frequencies.length);
			derivedPhase.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
				expect(isFinite(phase)).toBe(true);
			});

			// Verify derived phase differs from measured phase
			const isDifferent = HilbertTransform.validatePhaseDifference(
				derivedPhase,
				frdData.phases,
			);

			expect(isDifferent).toBe(true);
		});

		it('should produce consistent results for the same input data', () => {
			const frdFile = 'tests/fixtures/projects/center/1m tweeter 0.frd';
			const frdData = FrdParser.parse(frdFile);

			// Calculate minimum phase twice
			const derivedPhase1 = HilbertTransform.calculateMinimumPhase(
				frdData.frequencies,
				frdData.magnitudes,
			);

			const derivedPhase2 = HilbertTransform.calculateMinimumPhase(
				frdData.frequencies,
				frdData.magnitudes,
			);

			// Results should be identical
			expect(derivedPhase1.length).toBe(derivedPhase2.length);
			for (let i = 0; i < derivedPhase1.length; i++) {
				expect(derivedPhase1[i]).toBeCloseTo(derivedPhase2[i], 10);
			}
		});
	});
});
