/**
 * Unit tests for fractional octave smoothing algorithm
 */

describe('Fractional Octave Smoothing', () => {
	// Helper function to apply smoothing (extracted from component logic)
	function applySmoothing(frequencies, values, smoothingType) {
		if (smoothingType === 'none' || frequencies.length === 0) {
			return values;
		}

		const smoothed = [];
		const octaveFraction = getSmoothingFraction(smoothingType);

		for (let i = 0; i < frequencies.length; i++) {
			const centerFreq = frequencies[i];
			const lowerFreq = centerFreq / (2 ** (octaveFraction / 2));
			const upperFreq = centerFreq * (2 ** (octaveFraction / 2));

			let sum = 0;
			let count = 0;

			for (let j = 0; j < frequencies.length; j++) {
				if (frequencies[j] >= lowerFreq && frequencies[j] <= upperFreq) {
					sum += values[j];
					count++;
				}
			}

			smoothed[i] = count > 0 ? sum / count : values[i];
		}

		return smoothed;
	}

	function getSmoothingFraction(smoothingType) {
		const fractions = {
			'1/24': 1 / 24,
			'1/12': 1 / 12,
			'1/6': 1 / 6,
			'1/3': 1 / 3,
			'1/2': 1 / 2,
			1: 1,
			erb: 1 / 3, // ERB approximation (roughly 1/3 octave)
		};
		return fractions[smoothingType] || 0;
	}

	describe('getSmoothingFraction', () => {
		test('should return correct fraction for 1/24 octave', () => {
			expect(getSmoothingFraction('1/24')).toBeCloseTo(1 / 24);
		});

		test('should return correct fraction for 1/12 octave', () => {
			expect(getSmoothingFraction('1/12')).toBeCloseTo(1 / 12);
		});

		test('should return correct fraction for 1/6 octave', () => {
			expect(getSmoothingFraction('1/6')).toBeCloseTo(1 / 6);
		});

		test('should return correct fraction for 1/3 octave', () => {
			expect(getSmoothingFraction('1/3')).toBeCloseTo(1 / 3);
		});

		test('should return correct fraction for 1/2 octave', () => {
			expect(getSmoothingFraction('1/2')).toBeCloseTo(1 / 2);
		});

		test('should return correct fraction for 1 octave', () => {
			expect(getSmoothingFraction('1')).toBe(1);
		});

		test('should return correct fraction for ERB', () => {
			expect(getSmoothingFraction('erb')).toBeCloseTo(1 / 3);
		});

		test('should return 0 for unknown smoothing type', () => {
			expect(getSmoothingFraction('unknown')).toBe(0);
		});
	});

	describe('applySmoothing', () => {
		test('should return original values when smoothing is none', () => {
			const frequencies = [100, 200, 400, 800];
			const values = [85, 86, 87, 88];
			const result = applySmoothing(frequencies, values, 'none');
			expect(result).toEqual(values);
		});

		test('should return original values for empty frequency array', () => {
			const frequencies = [];
			const values = [];
			const result = applySmoothing(frequencies, values, '1/3');
			expect(result).toEqual(values);
		});

		test('should smooth values with 1 octave smoothing', () => {
			// Create test data with a spike
			// For 1 octave at 200 Hz: lower = 200/2^0.5 ≈ 141.4 Hz, upper = 200*2^0.5 ≈ 282.8 Hz
			// Need frequencies that fall within this range
			const frequencies = [100, 150, 200, 250, 400, 566, 800];
			const values = [80, 85, 90, 85, 80, 80, 80]; // Spike at 200 Hz with neighbors

			const result = applySmoothing(frequencies, values, '1');

			// The spike should be smoothed out
			// At 200 Hz, 1 octave smoothing includes 150, 200, 250 Hz
			// Average of [85, 90, 85] = 86.67
			expect(result[2]).toBeGreaterThan(85);
			expect(result[2]).toBeLessThanOrEqual(90);
			expect(result[2]).toBeCloseTo(86.67, 0);
		});

		test('should smooth values with 1/3 octave smoothing', () => {
			const frequencies = [100, 126, 159, 200, 252, 317, 400];
			const values = [80, 80, 80, 90, 80, 80, 80]; // Spike at 200 Hz

			const result = applySmoothing(frequencies, values, '1/3');

			// The spike should be smoothed but less than 1 octave
			// At 200 Hz with 1/3 octave, includes nearby frequencies
			expect(result[3]).toBeGreaterThan(80);
			expect(result[3]).toBeLessThanOrEqual(90);
		});

		test('should preserve flat response', () => {
			const frequencies = [100, 200, 400, 800, 1600];
			const values = [85, 85, 85, 85, 85];

			const result = applySmoothing(frequencies, values, '1/3');

			// All values should remain 85
			result.forEach((value) => {
				expect(value).toBeCloseTo(85);
			});
		});

		test('should handle single frequency point', () => {
			const frequencies = [1000];
			const values = [85];

			const result = applySmoothing(frequencies, values, '1/3');

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(85);
		});

		test('should calculate correct frequency window for 1/3 octave', () => {
			// For 1000 Hz with 1/3 octave smoothing:
			// Lower freq = 1000 / 2^(1/6) ≈ 891 Hz
			// Upper freq = 1000 * 2^(1/6) ≈ 1122 Hz
			const frequencies = [800, 891, 1000, 1122, 1260];
			const values = [70, 80, 90, 80, 70];

			const result = applySmoothing(frequencies, values, '1/3');

			// At 1000 Hz, should average 891, 1000, 1122 (80, 90, 80)
			expect(result[2]).toBeCloseTo((80 + 90 + 80) / 3, 1);
		});

		test('should handle narrow smoothing (1/24 octave)', () => {
			const frequencies = [100, 102, 104, 106, 108, 110];
			const values = [80, 80, 90, 80, 80, 80];

			const result = applySmoothing(frequencies, values, '1/24');

			// Very narrow smoothing should affect fewer points
			expect(result[2]).toBeGreaterThan(80);
		});

		test('should handle wide smoothing (1 octave)', () => {
			const frequencies = [100, 141, 200, 283, 400, 566, 800];
			const values = [80, 82, 84, 86, 88, 90, 92];

			const result = applySmoothing(frequencies, values, '1');

			// Wide smoothing should average many points
			// Each point should be closer to the overall average
			const overallAverage = values.reduce((a, b) => a + b, 0) / values.length;
			result.forEach((value) => {
				expect(Math.abs(value - overallAverage)).toBeLessThan(10);
			});
		});

		test('should not modify original arrays', () => {
			const frequencies = [100, 200, 400, 800];
			const values = [85, 86, 87, 88];
			const originalValues = [...values];

			applySmoothing(frequencies, values, '1/3');

			expect(values).toEqual(originalValues);
		});
	});
});
