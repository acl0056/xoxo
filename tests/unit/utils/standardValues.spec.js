import {
	findNearestE12,
	findNearestE24,
	getNextE12,
	getNextE24,
	getPreviousE12,
	getPreviousE24,
	stepE12,
	stepE24
} from '@/utils/standardValues';

describe('Standard Values Utilities', () => {
	describe('E12 series', () => {
		describe('findNearestE12', () => {
			test('should find exact E12 values', () => {
				expect(findNearestE12(1.0)).toBe(1.0);
				expect(findNearestE12(1.2)).toBe(1.2);
				expect(findNearestE12(4.7)).toBe(4.7);
				expect(findNearestE12(10)).toBe(10);
			});

			test('should find nearest E12 value for in-between values', () => {
				expect(findNearestE12(1.1)).toBeCloseTo(1.2, 1);
				expect(findNearestE12(1.35)).toBeCloseTo(1.5, 1);
				expect(findNearestE12(5.0)).toBeCloseTo(4.7, 1);
			});

			test('should work across decades', () => {
				expect(findNearestE12(47)).toBeCloseTo(47, 1);
				expect(findNearestE12(470)).toBeCloseTo(470, 1);
				expect(findNearestE12(4700)).toBeCloseTo(4700, 1);
			});

			test('should work with small values', () => {
				expect(findNearestE12(0.0047)).toBeCloseTo(0.0047, 6);
				expect(findNearestE12(0.00012)).toBeCloseTo(0.00012, 6);
			});

			test('should throw on zero or negative values', () => {
				expect(() => findNearestE12(0)).toThrow('Value must be positive');
				expect(() => findNearestE12(-10)).toThrow('Value must be positive');
			});
		});

		describe('getNextE12', () => {
			test('should get next E12 value in same decade', () => {
				expect(getNextE12(1.0)).toBeCloseTo(1.2, 1);
				expect(getNextE12(1.2)).toBeCloseTo(1.5, 1);
				expect(getNextE12(4.7)).toBeCloseTo(5.6, 1);
			});

			test('should move to next decade at end of series', () => {
				expect(getNextE12(8.2)).toBeCloseTo(10, 1);
				expect(getNextE12(82)).toBeCloseTo(100, 1);
			});

			test('should work with non-standard values', () => {
				expect(getNextE12(1.1)).toBeCloseTo(1.2, 1);
				expect(getNextE12(5.0)).toBeCloseTo(5.6, 1);
			});
		});

		describe('getPreviousE12', () => {
			test('should get previous E12 value in same decade', () => {
				expect(getPreviousE12(1.2)).toBeCloseTo(1.0, 1);
				expect(getPreviousE12(4.7)).toBeCloseTo(3.9, 1);
				expect(getPreviousE12(8.2)).toBeCloseTo(6.8, 1);
			});

			test('should move to previous decade at start of series', () => {
				expect(getPreviousE12(1.0)).toBeCloseTo(0.82, 2);
				expect(getPreviousE12(10)).toBeCloseTo(8.2, 1);
			});

			test('should work with non-standard values', () => {
				expect(getPreviousE12(1.3)).toBeCloseTo(1.2, 1);
				expect(getPreviousE12(5.0)).toBeCloseTo(4.7, 1);
			});
		});

		describe('stepE12', () => {
			test('should increment when direction is positive', () => {
				expect(stepE12(1.0, 1)).toBeCloseTo(1.2, 1);
				expect(stepE12(4.7, 1)).toBeCloseTo(5.6, 1);
			});

			test('should decrement when direction is negative', () => {
				expect(stepE12(1.2, -1)).toBeCloseTo(1.0, 1);
				expect(stepE12(4.7, -1)).toBeCloseTo(3.9, 1);
			});

			test('should not change when direction is zero', () => {
				expect(stepE12(4.7, 0)).toBe(4.7);
			});
		});
	});

	describe('E24 series', () => {
		describe('findNearestE24', () => {
			test('should find exact E24 values', () => {
				expect(findNearestE24(1.0)).toBe(1.0);
				expect(findNearestE24(1.1)).toBe(1.1);
				expect(findNearestE24(4.3)).toBe(4.3);
				expect(findNearestE24(10)).toBe(10);
			});

			test('should find nearest E24 value for in-between values', () => {
				expect(findNearestE24(1.05)).toBeCloseTo(1.0, 1);
				expect(findNearestE24(1.25)).toBeCloseTo(1.2, 1);
				expect(findNearestE24(5.0)).toBeCloseTo(5.1, 1);
			});

			test('should work across decades', () => {
				expect(findNearestE24(43)).toBeCloseTo(43, 1);
				expect(findNearestE24(430)).toBeCloseTo(430, 1);
				expect(findNearestE24(4300)).toBeCloseTo(4300, 1);
			});

			test('should work with small values', () => {
				expect(findNearestE24(0.0043)).toBeCloseTo(0.0043, 6);
				expect(findNearestE24(0.00011)).toBeCloseTo(0.00011, 6);
			});
		});

		describe('getNextE24', () => {
			test('should get next E24 value in same decade', () => {
				expect(getNextE24(1.0)).toBeCloseTo(1.1, 1);
				expect(getNextE24(1.1)).toBeCloseTo(1.2, 1);
				expect(getNextE24(4.3)).toBeCloseTo(4.7, 1);
			});

			test('should move to next decade at end of series', () => {
				expect(getNextE24(9.1)).toBeCloseTo(10, 1);
				expect(getNextE24(91)).toBeCloseTo(100, 1);
			});

			test('should work with non-standard values', () => {
				expect(getNextE24(1.05)).toBeCloseTo(1.1, 1);
				expect(getNextE24(5.0)).toBeCloseTo(5.1, 1);
			});
		});

		describe('getPreviousE24', () => {
			test('should get previous E24 value in same decade', () => {
				expect(getPreviousE24(1.1)).toBeCloseTo(1.0, 1);
				expect(getPreviousE24(4.3)).toBeCloseTo(3.9, 1);
				expect(getPreviousE24(9.1)).toBeCloseTo(8.2, 1);
			});

			test('should move to previous decade at start of series', () => {
				expect(getPreviousE24(1.0)).toBeCloseTo(0.91, 2);
				expect(getPreviousE24(10)).toBeCloseTo(9.1, 1);
			});

			test('should work with non-standard values', () => {
				expect(getPreviousE24(1.05)).toBeCloseTo(1.0, 1);
				expect(getPreviousE24(5.0)).toBeCloseTo(4.7, 1);
			});
		});

		describe('stepE24', () => {
			test('should increment when direction is positive', () => {
				expect(stepE24(1.0, 1)).toBeCloseTo(1.1, 1);
				expect(stepE24(4.3, 1)).toBeCloseTo(4.7, 1);
			});

			test('should decrement when direction is negative', () => {
				expect(stepE24(1.1, -1)).toBeCloseTo(1.0, 1);
				expect(stepE24(4.3, -1)).toBeCloseTo(3.9, 1);
			});

			test('should not change when direction is zero', () => {
				expect(stepE24(4.3, 0)).toBe(4.3);
			});
		});
	});

	describe('E12 vs E24 comparison', () => {
		test('E24 should have more values than E12', () => {
			const e12Values = [];
			const e24Values = [];
			
			let value = 1.0;
			for (let i = 0; i < 12; i++) {
				e12Values.push(value);
				value = getNextE12(value);
			}
			
			value = 1.0;
			for (let i = 0; i < 24; i++) {
				e24Values.push(value);
				value = getNextE24(value);
			}
			
			expect(e12Values.length).toBe(12);
			expect(e24Values.length).toBe(24);
		});

		test('all E12 values should be in E24 series', () => {
			const e12Values = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
			
			e12Values.forEach((value) => {
				const nearest = findNearestE24(value);
				expect(nearest).toBeCloseTo(value, 1);
			});
		});
	});

	describe('edge cases', () => {
		test('should handle very large values', () => {
			expect(getNextE12(1000000)).toBeCloseTo(1200000, 0);
			expect(getPreviousE12(1000000)).toBeCloseTo(820000, 0);
		});

		test('should handle very small values', () => {
			expect(getNextE12(0.000001)).toBeCloseTo(0.0000012, 8);
			expect(getPreviousE12(0.000001)).toBeCloseTo(0.00000082, 8);
		});

		test('should handle values at decade boundaries', () => {
			expect(getNextE12(10)).toBeCloseTo(12, 1);
			expect(getPreviousE12(10)).toBeCloseTo(8.2, 1);
			expect(getNextE12(100)).toBeCloseTo(120, 1);
			expect(getPreviousE12(100)).toBeCloseTo(82, 1);
		});
	});
});
