import { parseEngineering, formatEngineering } from '@/utils/engineeringNotation';

describe('Engineering Notation Utilities', () => {
	describe('parseEngineering', () => {
		describe('valid inputs', () => {
			test('should parse kilo values', () => {
				expect(parseEngineering('4.7k')).toBe(4700);
				expect(parseEngineering('10k')).toBe(10000);
				expect(parseEngineering('1k')).toBe(1000);
			});

			test('should parse micro values', () => {
				expect(parseEngineering('10u')).toBeCloseTo(0.00001, 8);
				expect(parseEngineering('100u')).toBeCloseTo(0.0001, 8);
				expect(parseEngineering('1u')).toBeCloseTo(0.000001, 8);
			});

			test('should parse nano values', () => {
				expect(parseEngineering('100n')).toBeCloseTo(0.0000001, 10);
				expect(parseEngineering('10n')).toBeCloseTo(0.00000001, 10);
				expect(parseEngineering('1n')).toBeCloseTo(0.000000001, 10);
			});

			test('should parse pico values', () => {
				expect(parseEngineering('100p')).toBeCloseTo(0.0000000001, 12);
				expect(parseEngineering('10p')).toBeCloseTo(0.00000000001, 12);
			});

			test('should parse milli values', () => {
				expect(parseEngineering('100m')).toBe(0.1);
				expect(parseEngineering('10m')).toBe(0.01);
				expect(parseEngineering('1m')).toBe(0.001);
			});

			test('should parse mega values', () => {
				expect(parseEngineering('1M')).toBe(1000000);
				expect(parseEngineering('10M')).toBe(10000000);
			});

			test('should parse giga values', () => {
				expect(parseEngineering('1G')).toBe(1000000000);
				expect(parseEngineering('2.5G')).toBe(2500000000);
			});

			test('should parse tera values', () => {
				expect(parseEngineering('1T')).toBe(1000000000000);
			});

			test('should parse femto values', () => {
				expect(parseEngineering('1f')).toBeCloseTo(0.000000000000001, 15);
			});

			test('should parse values without suffix', () => {
				expect(parseEngineering('100')).toBe(100);
				expect(parseEngineering('8.2')).toBe(8.2);
				expect(parseEngineering('1')).toBe(1);
			});

			test('should parse decimal values', () => {
				expect(parseEngineering('4.7k')).toBe(4700);
				expect(parseEngineering('10.5k')).toBe(10500);
				expect(parseEngineering('0.1u')).toBeCloseTo(0.0000001, 10);
			});

			test('should parse values starting with decimal point', () => {
				expect(parseEngineering('.5k')).toBe(500);
				expect(parseEngineering('.1u')).toBeCloseTo(0.0000001, 10);
			});

			test('should parse negative values', () => {
				expect(parseEngineering('-4.7k')).toBe(-4700);
				expect(parseEngineering('-10u')).toBeCloseTo(-0.00001, 8);
			});

			test('should parse positive sign', () => {
				expect(parseEngineering('+4.7k')).toBe(4700);
				expect(parseEngineering('+10u')).toBeCloseTo(0.00001, 8);
			});

			test('should handle whitespace', () => {
				expect(parseEngineering('  4.7k  ')).toBe(4700);
				expect(parseEngineering(' 10u ')).toBeCloseTo(0.00001, 8);
			});

			test('should parse alternative micro symbol', () => {
				expect(parseEngineering('10μ')).toBeCloseTo(0.00001, 8);
			});
		});

		describe('edge cases', () => {
			test('should parse zero', () => {
				expect(parseEngineering('0')).toBe(0);
				expect(parseEngineering('0k')).toBe(0);
			});

			test('should parse very small values', () => {
				expect(parseEngineering('1f')).toBeCloseTo(1e-15, 15);
			});

			test('should parse very large values', () => {
				expect(parseEngineering('999T')).toBe(999e12);
			});
		});

		describe('invalid inputs', () => {
			test('should throw on non-string input', () => {
				expect(() => parseEngineering(123)).toThrow('Input must be a string');
				expect(() => parseEngineering(null)).toThrow('Input must be a string');
				expect(() => parseEngineering(undefined)).toThrow('Input must be a string');
			});

			test('should throw on empty string', () => {
				expect(() => parseEngineering('')).toThrow('Empty string is not valid');
				expect(() => parseEngineering('   ')).toThrow('Empty string is not valid');
			});

			test('should throw on invalid format', () => {
				expect(() => parseEngineering('abc')).toThrow('Invalid engineering notation');
				expect(() => parseEngineering('k10')).toThrow('Invalid engineering notation');
				expect(() => parseEngineering('10kk')).toThrow('Invalid engineering notation');
			});

			test('should throw on unknown suffix', () => {
				expect(() => parseEngineering('10x')).toThrow('Invalid engineering notation');
				expect(() => parseEngineering('10h')).toThrow('Invalid engineering notation');
			});

			test('should throw on multiple decimal points', () => {
				expect(() => parseEngineering('1.2.3k')).toThrow('Invalid engineering notation');
			});
		});
	});

	describe('formatEngineering', () => {
		describe('valid inputs', () => {
			test('should format kilo values', () => {
				expect(formatEngineering(4700)).toBe('4.7k');
				expect(formatEngineering(10000)).toBe('10k');
				expect(formatEngineering(1000)).toBe('1k');
			});

			test('should format micro values', () => {
				expect(formatEngineering(0.00001)).toBe('10u');
				expect(formatEngineering(0.000001)).toBe('1u');
			});

			test('should format nano values', () => {
				expect(formatEngineering(0.0000001)).toBe('100n');
				expect(formatEngineering(0.00000001)).toBe('10n');
			});

			test('should format pico values', () => {
				expect(formatEngineering(0.0000000001)).toBe('100p');
				expect(formatEngineering(0.00000000001)).toBe('10p');
			});

			test('should format milli values', () => {
				expect(formatEngineering(0.1)).toBe('100m');
				expect(formatEngineering(0.01)).toBe('10m');
				expect(formatEngineering(0.001)).toBe('1m');
			});

			test('should format mega values', () => {
				expect(formatEngineering(1000000)).toBe('1M');
				expect(formatEngineering(10000000)).toBe('10M');
			});

			test('should format giga values', () => {
				expect(formatEngineering(1000000000)).toBe('1G');
			});

			test('should format tera values', () => {
				expect(formatEngineering(1000000000000)).toBe('1T');
			});

			test('should format values without suffix', () => {
				expect(formatEngineering(100)).toBe('100');
				expect(formatEngineering(10)).toBe('10');
				expect(formatEngineering(1)).toBe('1');
				expect(formatEngineering(8.2)).toBe('8.2');
			});

			test('should format negative values', () => {
				expect(formatEngineering(-4700)).toBe('-4.7k');
				expect(formatEngineering(-0.00001)).toBe('-10u');
			});

			test('should remove trailing zeros', () => {
				expect(formatEngineering(1000)).toBe('1k');
				expect(formatEngineering(10000)).toBe('10k');
			});
		});

		describe('edge cases', () => {
			test('should format zero', () => {
				expect(formatEngineering(0)).toBe('0');
			});

			test('should format very small values', () => {
				const result = formatEngineering(1e-15);
				expect(result).toBe('1f');
			});

			test('should format very large values', () => {
				expect(formatEngineering(999e12)).toBe('999T');
			});

			test('should use scientific notation for extremely small values', () => {
				const result = formatEngineering(1e-20);
				expect(result).toMatch(/e/);
			});

			test('should handle precision parameter', () => {
				expect(formatEngineering(4567, 2)).toBe('4.6k');
				expect(formatEngineering(4567, 4)).toBe('4.567k');
			});
		});

		describe('invalid inputs', () => {
			test('should throw on non-number input', () => {
				expect(() => formatEngineering('123')).toThrow('Value must be a valid number');
				expect(() => formatEngineering(null)).toThrow('Value must be a valid number');
				expect(() => formatEngineering(undefined)).toThrow('Value must be a valid number');
			});

			test('should throw on NaN', () => {
				expect(() => formatEngineering(NaN)).toThrow('Value must be a valid number');
			});

			test('should throw on infinite values', () => {
				expect(() => formatEngineering(Infinity)).toThrow('Value must be finite');
				expect(() => formatEngineering(-Infinity)).toThrow('Value must be finite');
			});
		});
	});

	describe('round-trip conversion', () => {
		test('should preserve value through parse and format', () => {
			const testValues = [
				'4.7k',
				'10u',
				'1M',
				'8.2',
				'100m'
			];

			testValues.forEach((notation) => {
				const parsed = parseEngineering(notation);
				const formatted = formatEngineering(parsed);
				const reparsed = parseEngineering(formatted);
				// Use relative tolerance for floating point comparison
				const tolerance = Math.abs(parsed) * 1e-6;
				expect(Math.abs(reparsed - parsed)).toBeLessThan(Math.max(tolerance, 1e-10));
			});
		});

		test('should handle numeric round-trip', () => {
			const testValues = [
				4700,
				0.00001,
				1000000,
				8.2,
				0.1
			];

			testValues.forEach((value) => {
				const formatted = formatEngineering(value);
				const parsed = parseEngineering(formatted);
				// Use relative tolerance for floating point comparison
				const tolerance = Math.abs(value) * 1e-6;
				expect(Math.abs(parsed - value)).toBeLessThan(Math.max(tolerance, 1e-10));
			});
		});
	});
});
