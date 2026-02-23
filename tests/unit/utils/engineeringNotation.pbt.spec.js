import fc from 'fast-check';
import { parseEngineering, formatEngineering } from '@/utils/engineeringNotation';

describe('Feature: crossover-network-simulator, Property 9: Engineering notation parsing round-trip', () => {
	test('parsing and formatting should be inverse operations', () => {
		// Generator for valid engineering notation strings
		const engineeringNotationGenerator = fc.tuple(
			fc.double({ min: 0.1, max: 999, noNaN: true }),
			fc.constantFrom('T', 'G', 'M', 'k', '', 'm', 'u', 'n', 'p', 'f')
		).map(([value, suffix]) => {
			// Format the value with appropriate precision
			const formatted = value.toFixed(2).replace(/\.?0+$/, '');
			return `${formatted}${suffix}`;
		});

		fc.assert(
			fc.property(engineeringNotationGenerator, (notation) => {
				const parsed = parseEngineering(notation);
				const formatted = formatEngineering(parsed);
				const reparsed = parseEngineering(formatted);

				// The reparsed value should be very close to the original parsed value
				// Use relative tolerance for floating point comparison
				const tolerance = Math.abs(parsed) * 1e-6;
				const difference = Math.abs(reparsed - parsed);
				
				expect(difference).toBeLessThan(Math.max(tolerance, 1e-10));
			}),
			{ numRuns: 100 }
		);
	});

	test('formatting and parsing numeric values should preserve value', () => {
		// Generator for numeric values across different scales
		const numericValueGenerator = fc.oneof(
			fc.double({ min: 1e-15, max: 1e-12, noNaN: true }), // femto range
			fc.double({ min: 1e-12, max: 1e-9, noNaN: true }),  // pico range
			fc.double({ min: 1e-9, max: 1e-6, noNaN: true }),   // nano range
			fc.double({ min: 1e-6, max: 1e-3, noNaN: true }),   // micro range
			fc.double({ min: 1e-3, max: 1, noNaN: true }),      // milli range
			fc.double({ min: 1, max: 1e3, noNaN: true }),       // base range
			fc.double({ min: 1e3, max: 1e6, noNaN: true }),     // kilo range
			fc.double({ min: 1e6, max: 1e9, noNaN: true }),     // mega range
			fc.double({ min: 1e9, max: 1e12, noNaN: true })     // giga range
		);

		fc.assert(
			fc.property(numericValueGenerator, (value) => {
				const formatted = formatEngineering(value);
				const parsed = parseEngineering(formatted);

				// The parsed value should be very close to the original value
				// Use relative tolerance for floating point comparison
				const tolerance = Math.abs(value) * 1e-6;
				const difference = Math.abs(parsed - value);
				
				expect(difference).toBeLessThan(Math.max(tolerance, 1e-10));
			}),
			{ numRuns: 100 }
		);
	});

	test('parsing should handle various valid formats', () => {
		// Generator for different valid engineering notation formats
		const formatVariationsGenerator = fc.tuple(
			fc.double({ min: 0.1, max: 999, noNaN: true }),
			fc.constantFrom('k', 'M', 'G', 'm', 'u', 'n', 'p'),
			fc.boolean(), // with/without decimal point
			fc.boolean()  // with/without leading zero
		).map(([value, suffix, useDecimal, useLeadingZero]) => {
			let formatted;
			if (useDecimal) {
				formatted = value.toFixed(1);
			} else {
				formatted = Math.floor(value).toString();
			}
			
			if (!useLeadingZero && formatted.startsWith('0.')) {
				formatted = formatted.substring(1); // Remove leading zero: "0.5" -> ".5"
			}
			
			return `${formatted}${suffix}`;
		});

		fc.assert(
			fc.property(formatVariationsGenerator, (notation) => {
				// Should not throw
				const parsed = parseEngineering(notation);
				
				// Should produce a valid number
				expect(typeof parsed).toBe('number');
				expect(isFinite(parsed)).toBe(true);
				expect(isNaN(parsed)).toBe(false);
			}),
			{ numRuns: 100 }
		);
	});

	test('parsing should reject invalid formats', () => {
		// Generator for invalid engineering notation strings
		const invalidNotationGenerator = fc.oneof(
			fc.string().filter(s => !/^[+-]?(\d+\.?\d*|\.\d+)[TGMkmuμnpf]?$/.test(s) && s.trim() !== ''),
			fc.tuple(fc.double({ noNaN: true }), fc.string({ minLength: 1, maxLength: 3 }))
				.map(([num, suffix]) => `${num}${suffix}`)
				.filter(s => !/^[+-]?(\d+\.?\d*|\.\d+)[TGMkmuμnpf]?$/.test(s)),
			fc.constantFrom('abc', 'k10', '10kk', '10x', '1.2.3k', '')
		);

		fc.assert(
			fc.property(invalidNotationGenerator, (notation) => {
				// Should throw an error
				expect(() => parseEngineering(notation)).toThrow();
			}),
			{ numRuns: 100 }
		);
	});

	test('formatting should handle edge cases', () => {
		// Generator for edge case values
		const edgeCaseGenerator = fc.oneof(
			fc.constant(0),
			fc.double({ min: 1e-20, max: 1e-15, noNaN: true }), // very small
			fc.double({ min: 1e12, max: 1e15, noNaN: true }),   // very large
			fc.double({ min: -1e6, max: -1, noNaN: true })      // negative
		);

		fc.assert(
			fc.property(edgeCaseGenerator, (value) => {
				const formatted = formatEngineering(value);
				
				// Should produce a valid string
				expect(typeof formatted).toBe('string');
				expect(formatted.length).toBeGreaterThan(0);
				
				// If not scientific notation, should be parseable
				if (!formatted.includes('e')) {
					const parsed = parseEngineering(formatted);
					expect(isFinite(parsed)).toBe(true);
				}
			}),
			{ numRuns: 100 }
		);
	});
});
