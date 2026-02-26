import HilbertTransform from '../../src/simulation/HilbertTransform';

describe('HilbertTransform', () => {
	describe('calculateMinimumPhase', () => {
		it('should calculate minimum phase from magnitude data', () => {
			// Simple test case with flat magnitude response
			const frequencies = [100, 200, 400, 800, 1600, 3200, 6400];
			const magnitudes = [90, 90, 90, 90, 90, 90, 90]; // Flat response

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
			// For flat magnitude, minimum phase should be close to zero
			phases.forEach((phase) => {
				expect(Math.abs(phase)).toBeLessThan(10); // Within 10 degrees of zero
			});
		});

		it('should handle low-pass filter magnitude response', () => {
			// Simulated low-pass filter: magnitude decreases at high frequencies
			const frequencies = [100, 200, 400, 800, 1600, 3200, 6400];
			const magnitudes = [90, 90, 88, 84, 78, 70, 60]; // Decreasing

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
			// Minimum phase should be negative (lagging) for low-pass
			// Phase should become more negative at higher frequencies
			expect(phases[0]).toBeGreaterThan(phases[phases.length - 1]);
		});

		it('should handle high-pass filter magnitude response', () => {
			// Simulated high-pass filter: magnitude increases at high frequencies
			const frequencies = [100, 200, 400, 800, 1600, 3200, 6400];
			const magnitudes = [60, 70, 78, 84, 88, 90, 90]; // Increasing

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
// For high-pass filter, phase should be defined and reasonable
phases.forEach((phase) => {
expect(phase).toBeDefined();
expect(isNaN(phase)).toBe(false);
});
// Phase should vary with the magnitude slope
expect(Math.abs(phases[0] - phases[phases.length - 1])).toBeGreaterThan(5);
		});

		it('should throw error if frequencies and magnitudes have different lengths', () => {
			const frequencies = [100, 200, 400];
			const magnitudes = [90, 90]; // Wrong length

			expect(() => {
				HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);
			}).toThrow('Frequencies and magnitudes must have the same length');
		});

		it('should throw error if frequencies are not provided', () => {
			const magnitudes = [90, 90, 90];

			expect(() => {
				HilbertTransform.calculateMinimumPhase(null, magnitudes);
			}).toThrow('Frequencies and magnitudes are required');
		});

		it('should throw error if magnitudes are not provided', () => {
			const frequencies = [100, 200, 400];

			expect(() => {
				HilbertTransform.calculateMinimumPhase(frequencies, null);
			}).toThrow('Frequencies and magnitudes are required');
		});

		it('should throw error if less than 2 frequency points', () => {
			const frequencies = [100];
			const magnitudes = [90];

			expect(() => {
				HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);
			}).toThrow('At least 2 frequency points are required');
		});

		it('should throw error if frequencies are not monotonically increasing', () => {
			const frequencies = [100, 200, 150, 400]; // Not monotonic
			const magnitudes = [90, 90, 90, 90];

			expect(() => {
				HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);
			}).toThrow('Non-monotonic frequencies');
		});

		it('should handle negative magnitude values gracefully', () => {
			// Negative dB values are valid (magnitude < 1)
			const frequencies = [100, 200, 400, 800];
			const magnitudes = [-10, -5, 0, 5]; // Valid negative dB values

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
			phases.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
			});
		});

		it('should produce different phase than measured phase', () => {
			// Typical speaker response
			const frequencies = [100, 200, 400, 800, 1600, 3200, 6400];
			const magnitudes = [85, 88, 90, 92, 90, 88, 85];

			// Simulated measured phase (not minimum phase)
			const measuredPhase = [-30, -45, -60, -75, -90, -105, -120];

			const derivedPhase = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			// Derived phase should be different from measured phase
			let isDifferent = false;
			for (let i = 0; i < derivedPhase.length; i++) {
				if (Math.abs(derivedPhase[i] - measuredPhase[i]) > 5) {
					isDifferent = true;
					break;
				}
			}

			expect(isDifferent).toBe(true);
		});

		it('should handle logarithmically spaced frequencies', () => {
			// Typical logarithmic spacing used in audio
			const frequencies = [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20480];
			const magnitudes = [80, 82, 85, 88, 90, 92, 90, 88, 85, 82, 80];

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
			phases.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
				// Phase should be within reasonable range
				expect(Math.abs(phase)).toBeLessThan(360);
			});
		});

		it('should handle very small magnitude variations', () => {
			// Nearly flat response with small variations
			const frequencies = [100, 200, 400, 800, 1600];
			const magnitudes = [90.0, 90.1, 89.9, 90.0, 90.1];

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(frequencies.length);
			// With very small magnitude variations, phase should be close to zero
			phases.forEach((phase) => {
				expect(Math.abs(phase)).toBeLessThan(5);
			});
		});
	});

	describe('validatePhaseDifference', () => {
		it('should return true when no measured phase is provided', () => {
			const derivedPhase = [-10, -20, -30, -40];

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, null);

			expect(result).toBe(true);
		});

		it('should return true when measured phase is empty array', () => {
			const derivedPhase = [-10, -20, -30, -40];
			const measuredPhase = [];

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			expect(result).toBe(true);
		});

		it('should return true when phases have different lengths', () => {
			const derivedPhase = [-10, -20, -30, -40];
			const measuredPhase = [-15, -25, -35]; // Different length

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			expect(result).toBe(true);
		});

		it('should return true when phases are significantly different', () => {
			const derivedPhase = [-10, -20, -30, -40];
			const measuredPhase = [-30, -50, -70, -90]; // Very different

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			expect(result).toBe(true);
		});

		it('should return false when phases are nearly identical', () => {
			const derivedPhase = [-10.0, -20.0, -30.0, -40.0];
			const measuredPhase = [-10.1, -20.1, -30.1, -40.1]; // Very close

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			expect(result).toBe(false);
		});

		it('should use 1 degree average difference threshold', () => {
			// Average difference exactly at threshold
			const derivedPhase = [-10, -20, -30, -40];
			const measuredPhase = [-11, -21, -31, -41]; // 1 degree difference each

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			// Should return false because average difference is exactly 1.0
			expect(result).toBe(false);
		});

		it('should return true when average difference exceeds threshold', () => {
			// Average difference above threshold
			const derivedPhase = [-10, -20, -30, -40];
			const measuredPhase = [-12, -22, -32, -42]; // 2 degree difference each

			const result = HilbertTransform.validatePhaseDifference(derivedPhase, measuredPhase);

			// Should return true because average difference is 2.0 > 1.0
			expect(result).toBe(true);
		});
	});

	describe('Integration with typical speaker data', () => {
		it('should derive minimum phase from typical tweeter response', () => {
			// Typical tweeter: flat in passband, rolls off below
			const frequencies = [1000, 2000, 4000, 8000, 16000];
			const magnitudes = [85, 90, 92, 90, 88];

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(5);
			// Phase should be defined and reasonable
			phases.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
				expect(Math.abs(phase)).toBeLessThan(180);
			});
		});

		it('should derive minimum phase from typical woofer response', () => {
			// Typical woofer: flat in passband, rolls off above
			const frequencies = [50, 100, 200, 400, 800, 1600];
			const magnitudes = [88, 90, 92, 90, 85, 78];

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(6);
			// Phase should be defined and reasonable
			phases.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
			});
		});

		it('should handle band-pass response (typical midrange)', () => {
			// Typical midrange: rolls off at both ends
			const frequencies = [200, 400, 800, 1600, 3200, 6400];
			const magnitudes = [75, 85, 90, 90, 85, 75];

			const phases = HilbertTransform.calculateMinimumPhase(frequencies, magnitudes);

			expect(phases).toHaveLength(6);
			phases.forEach((phase) => {
				expect(phase).toBeDefined();
				expect(isNaN(phase)).toBe(false);
			});
		});
	});
});
